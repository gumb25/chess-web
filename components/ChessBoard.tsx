'use client';

import React, { useState, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import ChessPiece from './ChessPiece';
import { BoardTheme, BOARD_THEMES, PieceColor, PieceType } from '@/lib/types';

export interface Arrow {
  from: Square;
  to: Square;
  color?: string;
  opacity?: number;
}

interface Props {
  chess: Chess;
  flipped?: boolean;
  theme?: BoardTheme;
  onMove?: (from: Square, to: Square, promotion?: string) => boolean;
  disabled?: boolean;
  hintSquare?: Square | null;
  hintDestSquare?: Square | null;
  arrows?: Arrow[];
  lastMove?: { from: Square; to: Square } | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function squareToCoords(sq: Square, flipped: boolean): { col: number; row: number } {
  const file = FILES.indexOf(sq[0]);
  const rank = parseInt(sq[1]) - 1;
  return {
    col: flipped ? 7 - file : file,
    row: flipped ? rank : 7 - rank,
  };
}

export default function ChessBoard({
  chess,
  flipped = false,
  theme = 'classic',
  onMove,
  disabled = false,
  hintSquare,
  hintDestSquare,
  arrows = [],
  lastMove,
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);

  const colors = BOARD_THEMES[theme];
  const BOARD_SIZE = 480;
  const CELL = BOARD_SIZE / 8;

  const board = chess.board();

  const getPiece = useCallback((sq: Square) => {
    const file = FILES.indexOf(sq[0]);
    const rank = parseInt(sq[1]) - 1;
    return board[7 - rank][file];
  }, [board]);

  const handleSquareClick = useCallback((sq: Square) => {
    if (disabled) return;

    const piece = getPiece(sq);

    if (selected) {
      if (legalMoves.includes(sq)) {
        const fromPiece = getPiece(selected);
        const isPromotion = fromPiece?.type === 'p' && (sq[1] === '8' || sq[1] === '1');
        if (isPromotion) {
          setPromotionPending({ from: selected, to: sq });
          setSelected(null);
          setLegalMoves([]);
          return;
        }
        const moved = onMove?.(selected, sq);
        if (moved !== false) {
          setSelected(null);
          setLegalMoves([]);
          return;
        }
      }
      if (piece && piece.color === chess.turn()) {
        setSelected(sq);
        const moves = chess.moves({ square: sq, verbose: true });
        setLegalMoves(moves.map(m => m.to as Square));
        return;
      }
      setSelected(null);
      setLegalMoves([]);
      return;
    }

    if (piece && piece.color === chess.turn()) {
      setSelected(sq);
      const moves = chess.moves({ square: sq, verbose: true });
      setLegalMoves(moves.map(m => m.to as Square));
    }
  }, [disabled, selected, legalMoves, chess, getPiece, onMove]);

  const handlePromotion = (piece: PieceType) => {
    if (!promotionPending) return;
    onMove?.(promotionPending.from, promotionPending.to, piece);
    setPromotionPending(null);
  };

  const inCheck = chess.isCheck();
  const kingSquare: Square | null = (() => {
    if (!inCheck) return null;
    for (const row of board) {
      for (const cell of row) {
        if (cell?.type === 'k' && cell.color === chess.turn()) {
          return cell.square as Square;
        }
      }
    }
    return null;
  })();

  const renderArrows = () => {
    if (!arrows.length) return null;
    return arrows.map((arrow, i) => {
      const from = squareToCoords(arrow.from, flipped);
      const to = squareToCoords(arrow.to, flipped);
      const x1 = (from.col + 0.5) * CELL;
      const y1 = (from.row + 0.5) * CELL;
      const x2 = (to.col + 0.5) * CELL;
      const y2 = (to.row + 0.5) * CELL;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const arrowHeadLen = 18;
      const shorten = arrowHeadLen * 0.7;
      const ex = x2 - (dx / len) * shorten;
      const ey = y2 - (dy / len) * shorten;
      const color = arrow.color ?? '#3b82f6';
      const opacity = arrow.opacity ?? 0.75;
      return (
        <g key={i} opacity={opacity} pointerEvents="none">
          <defs>
            <marker id={`ah-${i}`} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill={color}/>
            </marker>
          </defs>
          <line
            x1={x1} y1={y1} x2={ex} y2={ey}
            stroke={color} strokeWidth="9" strokeLinecap="round"
            markerEnd={`url(#ah-${i})`}
          />
        </g>
      );
    });
  };

  const squares: React.ReactNode[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = flipped ? 7 - col : col;
      const rank = flipped ? row : 7 - row;
      const sq = `${FILES[file]}${rank + 1}` as Square;
      const isLight = (file + rank) % 2 === 1;
      const piece = board[7 - rank][file];

      let bg = isLight ? colors.light : colors.dark;
      const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
      const isSelected = selected === sq;
      const isHint = hintSquare === sq;
      const isHintDest = hintDestSquare === sq;
      const isKingInCheck = kingSquare === sq;

      if (isSelected) bg = isLight ? '#f6f669' : '#baca2b';
      else if (isLastMove) bg = isLight ? '#cdd26a' : '#aaa23a';

      const x = col * CELL;
      const y = row * CELL;

      squares.push(
        <g key={sq} onClick={() => handleSquareClick(sq)} style={{ cursor: disabled ? 'default' : 'pointer' }}>
          <rect x={x} y={y} width={CELL} height={CELL} fill={bg}/>
          {isKingInCheck && (
            <rect x={x} y={y} width={CELL} height={CELL} fill="rgba(255,0,0,0.4)" rx="4"/>
          )}
          {isHint && !isHintDest && (
            <rect x={x} y={y} width={CELL} height={CELL} fill="rgba(255,200,0,0.45)" rx="4"/>
          )}
          {isHintDest && (
            <rect x={x} y={y} width={CELL} height={CELL} fill="rgba(0,200,80,0.45)" rx="4"/>
          )}
          {legalMoves.includes(sq) && (
            piece
              ? <rect x={x} y={y} width={CELL} height={CELL} fill="rgba(0,0,0,0)" stroke="rgba(0,0,0,0.25)" strokeWidth={CELL * 0.1} rx="2"/>
              : <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL * 0.16} fill="rgba(0,0,0,0.22)"/>
          )}
          {piece && (
            <foreignObject x={x + CELL * 0.06} y={y + CELL * 0.06} width={CELL * 0.88} height={CELL * 0.88}>
              <ChessPiece color={piece.color as PieceColor} type={piece.type as PieceType} size={CELL}/>
            </foreignObject>
          )}
          {col === 0 && (
            <text x={x + 3} y={y + 13} fontSize={11} fill={isLight ? colors.dark : colors.light} fontWeight="600" fontFamily="sans-serif" pointerEvents="none">
              {rank + 1}
            </text>
          )}
          {row === 7 && (
            <text x={x + CELL - 11} y={y + CELL - 3} fontSize={11} fill={isLight ? colors.dark : colors.light} fontWeight="600" fontFamily="sans-serif" pointerEvents="none">
              {FILES[file]}
            </text>
          )}
        </g>
      );
    }
  }

  return (
    <div className="relative select-none" style={{ width: BOARD_SIZE, height: BOARD_SIZE }}>
      <svg width={BOARD_SIZE} height={BOARD_SIZE} style={{ display: 'block' }}>
        {squares}
        {renderArrows()}
      </svg>

      {promotionPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="bg-white rounded-xl p-4 flex gap-3 shadow-2xl">
            {(['q', 'r', 'b', 'n'] as PieceType[]).map(p => (
              <button
                key={p}
                onClick={() => handlePromotion(p)}
                className="hover:bg-gray-100 rounded-lg p-1 transition-colors"
              >
                <ChessPiece color={chess.turn() as PieceColor} type={p} size={64}/>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
