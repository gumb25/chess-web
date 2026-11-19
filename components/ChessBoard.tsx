'use client';

import React, { useState, useCallback, useId, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import ChessPiece, { BoardPieceG } from './ChessPiece';
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
  /** Briefly tints this square red (e.g. a wrong puzzle move). */
  errorSquare?: Square | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const BOARD_SIZE = 480;
const CELL = BOARD_SIZE / 8;
// Pointer travel (in board units) before a press becomes a drag.
const DRAG_THRESHOLD = 4;

function squareToCoords(sq: Square, flipped: boolean): { col: number; row: number } {
  const file = FILES.indexOf(sq[0]);
  const rank = parseInt(sq[1]) - 1;
  return {
    col: flipped ? 7 - file : file,
    row: flipped ? rank : 7 - rank,
  };
}

function coordsToSquare(col: number, row: number, flipped: boolean): Square | null {
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const file = flipped ? 7 - col : col;
  const rank = flipped ? row : 7 - row;
  return `${FILES[file]}${rank + 1}` as Square;
}

interface DragState {
  from: Square;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  wasSelected: boolean;
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
  errorSquare,
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverSquare, setHoverSquare] = useState<Square | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const markerPrefix = useId();

  // A new position (move played, undo, next puzzle…) invalidates any
  // selection, drag or pending promotion made on the old one.
  const [prevChess, setPrevChess] = useState(chess);
  if (chess !== prevChess) {
    setPrevChess(chess);
    setSelected(null);
    setLegalMoves([]);
    setPromotionPending(null);
    setDrag(null);
    setHoverSquare(null);
  }

  const colors = BOARD_THEMES[theme];
  const board = chess.board();

  const getPiece = useCallback((sq: Square) => {
    const file = FILES.indexOf(sq[0]);
    const rank = parseInt(sq[1]) - 1;
    return board[7 - rank][file];
  }, [board]);

  const clearSelection = () => {
    setSelected(null);
    setLegalMoves([]);
  };

  const select = (sq: Square) => {
    setSelected(sq);
    setLegalMoves(chess.moves({ square: sq, verbose: true }).map(m => m.to as Square));
  };

  // Returns true when the move was played (or a promotion choice opened).
  const tryMove = (from: Square, to: Square): boolean => {
    const fromPiece = getPiece(from);
    const isPromotion = fromPiece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    if (isPromotion) {
      setPromotionPending({ from, to });
      clearSelection();
      return true;
    }
    const moved = onMove?.(from, to);
    clearSelection();
    return moved !== false;
  };

  const pointToBoard = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * BOARD_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * BOARD_SIZE;
    return { x, y, sq: coordsToSquare(Math.floor(x / CELL), Math.floor(y / CELL), flipped) };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled || promotionPending || e.button > 0) return;
    const { x, y, sq } = pointToBoard(e);
    if (!sq) return;
    const piece = getPiece(sq);

    if (selected && sq !== selected && legalMoves.includes(sq)) {
      tryMove(selected, sq);
      return;
    }
    if (piece && piece.color === chess.turn()) {
      const wasSelected = selected === sq;
      if (!wasSelected) select(sq);
      setDrag({ from: sq, startX: x, startY: y, x, y, moved: false, wasSelected });
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    clearSelection();
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const { x, y, sq } = pointToBoard(e);
    const moved = drag.moved || Math.hypot(x - drag.startX, y - drag.startY) > DRAG_THRESHOLD;
    setDrag({ ...drag, x, y, moved });
    setHoverSquare(moved ? sq : null);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const { sq } = pointToBoard(e);
    const d = drag;
    setDrag(null);
    setHoverSquare(null);
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);

    if (d.moved) {
      if (sq && sq !== d.from && legalMoves.includes(sq)) tryMove(d.from, sq);
      // Dropped back on its own square (or somewhere illegal): keep it
      // selected so a tap on the destination still works.
      return;
    }
    // A plain tap on an already-selected piece toggles it off.
    if (d.wasSelected && sq === d.from) clearSelection();
  };

  const handlePointerCancel = () => {
    setDrag(null);
    setHoverSquare(null);
  };

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
        if (cell?.type === 'k' && cell.color === chess.turn()) return cell.square as Square;
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
      if (len === 0) return null;
      const shorten = 18 * 0.7;
      const ex = x2 - (dx / len) * shorten;
      const ey = y2 - (dy / len) * shorten;
      const color = arrow.color ?? '#3b82f6';
      const opacity = arrow.opacity ?? 0.75;
      return (
        <g key={i} opacity={opacity} pointerEvents="none">
          <defs>
            <marker id={`${markerPrefix}ah-${i}`} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill={color}/>
            </marker>
          </defs>
          <line
            x1={x1 + (dx / len) * 8} y1={y1 + (dy / len) * 8} x2={ex} y2={ey}
            stroke={color} strokeWidth="10" strokeLinecap="round"
            markerEnd={`url(#${markerPrefix}ah-${i})`}
          />
        </g>
      );
    });
  };

  const squares: React.ReactNode[] = [];
  const pieces: React.ReactNode[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = flipped ? 7 - col : col;
      const rank = flipped ? row : 7 - row;
      const sq = `${FILES[file]}${rank + 1}` as Square;
      const isLight = (file + rank) % 2 === 1;
      const piece = board[7 - rank][file];
      const x = col * CELL;
      const y = row * CELL;

      const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
      const isSelected = selected === sq;
      const coordColor = isLight ? colors.dark : colors.light;

      squares.push(
        <g key={sq}>
          <rect x={x} y={y} width={CELL} height={CELL} fill={isLight ? colors.light : colors.dark}/>
          {isLastMove && <rect x={x} y={y} width={CELL} height={CELL} fill="rgb(255, 210, 40)" opacity={0.38}/>}
          {isSelected && <rect x={x} y={y} width={CELL} height={CELL} fill="rgb(255, 225, 40)" opacity={0.55}/>}
          {kingSquare === sq && (
            <rect x={x} y={y} width={CELL} height={CELL} fill={`url(#${markerPrefix}check)`}/>
          )}
          {errorSquare === sq && <rect x={x} y={y} width={CELL} height={CELL} fill="rgb(220, 50, 40)" opacity={0.5}/>}
          {hintSquare === sq && hintDestSquare !== sq && (
            <rect x={x + 2} y={y + 2} width={CELL - 4} height={CELL - 4} fill="rgba(255,190,0,0.35)" stroke="rgba(230,150,0,0.9)" strokeWidth={4} rx={6}/>
          )}
          {hintDestSquare === sq && (
            <rect x={x + 2} y={y + 2} width={CELL - 4} height={CELL - 4} fill="rgba(40,200,100,0.35)" stroke="rgba(20,160,80,0.9)" strokeWidth={4} rx={6}/>
          )}
          {hoverSquare === sq && legalMoves.includes(sq) && (
            <rect x={x + 1.5} y={y + 1.5} width={CELL - 3} height={CELL - 3} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={3}/>
          )}
          {legalMoves.includes(sq) && (
            piece
              ? <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL * 0.46} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={CELL * 0.08}/>
              : <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL * 0.15} fill="rgba(0,0,0,0.2)"/>
          )}
          {col === 0 && (
            <text x={x + 4} y={y + 14} fontSize={11} fill={coordColor} fontWeight="700" pointerEvents="none" style={{ fontFamily: 'inherit' }}>
              {rank + 1}
            </text>
          )}
          {row === 7 && (
            <text x={x + CELL - 10} y={y + CELL - 5} fontSize={11} fill={coordColor} fontWeight="700" pointerEvents="none" style={{ fontFamily: 'inherit' }}>
              {FILES[file]}
            </text>
          )}
        </g>
      );

      if (piece) {
        const dragging = drag?.moved && drag.from === sq;
        pieces.push(
          <g key={`p-${sq}`} opacity={dragging ? 0.3 : 1}>
            <BoardPieceG color={piece.color as PieceColor} type={piece.type as PieceType} x={x} y={y} cellSize={CELL}/>
          </g>
        );
      }
    }
  }

  const draggedPiece = drag?.moved ? getPiece(drag.from) : null;
  const interactive = !disabled && !!onMove;

  return (
    <div
      className="relative select-none w-full rounded-lg overflow-hidden"
      style={{ boxShadow: 'var(--shadow-board)' }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        style={{
          width: '100%',
          display: 'block',
          touchAction: interactive ? 'none' : 'auto',
          cursor: drag?.moved ? 'grabbing' : interactive ? 'pointer' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        role="img"
        aria-label="Chess board"
      >
        <defs>
          <radialGradient id={`${markerPrefix}check`}>
            <stop offset="0%" stopColor="rgb(255,0,0)" stopOpacity="0.85"/>
            <stop offset="45%" stopColor="rgb(231,0,0)" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="rgb(169,0,0)" stopOpacity="0"/>
          </radialGradient>
        </defs>
        {squares}
        {pieces}
        {renderArrows()}
        {draggedPiece && drag && (
          <g pointerEvents="none" style={{ filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))' }}>
            <BoardPieceG
              color={draggedPiece.color as PieceColor}
              type={draggedPiece.type as PieceType}
              x={drag.x - CELL * 0.55}
              y={drag.y - CELL * 0.6}
              cellSize={CELL * 1.1}
            />
          </g>
        )}
      </svg>

      {promotionPending && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/55 z-10 backdrop-blur-[2px]"
          onClick={() => setPromotionPending(null)}
        >
          <div className="card animate-pop p-3 flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
            <div className="eyebrow">Promote to</div>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as PieceType[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePromotion(p)}
                  className="bg-surface-2 hover:bg-surface-3 rounded-xl p-1.5 transition-colors"
                  aria-label={({ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' } as Record<string, string>)[p]}
                >
                  <ChessPiece color={chess.turn() as PieceColor} type={p} size={60}/>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
