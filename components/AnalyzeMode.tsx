'use client';

import React, { useState, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { AppSettings } from '@/lib/types';
import { useEngineAnalysis, evalBar } from '@/hooks/useEngineAnalysis';
import { playMoveSound } from '@/lib/sound';

interface Props {
  settings: AppSettings;
  initialFen?: string;
  initialMoves?: string[];
  initialPlayerColor?: 'w' | 'b';
  onPlayFromHere?: (fen: string, color: 'w' | 'b') => void;
}

type LastMove = { from: Square; to: Square } | null;

// Replay a puzzle line into one snapshot per ply, starting from the position
// after the opponent's first (setup) move.
function buildLine(initialFen?: string, initialMoves?: string[]): { fen: string; lastMove: LastMove }[] {
  if (!initialFen || !initialMoves?.length) return [];
  const line: { fen: string; lastMove: LastMove }[] = [];
  const c = new Chess(initialFen);
  for (const uci of initialMoves) {
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    try { c.move({ from, to, promotion: uci[4] }); } catch { break; }
    line.push({ fen: c.fen(), lastMove: { from, to } });
  }
  return line;
}

function gameOverMessage(c: Chess): string | null {
  if (c.isCheckmate()) return c.turn() === 'w' ? 'Black wins by checkmate!' : 'White wins by checkmate!';
  if (c.isStalemate()) return 'Stalemate — draw.';
  if (c.isDraw()) return 'Draw.';
  return null;
}

export default function AnalyzeMode({ settings, initialFen, initialMoves, initialPlayerColor, onPlayFromHere }: Props) {
  const [line] = useState(() => buildLine(initialFen, initialMoves));
  const [lineIdx, setLineIdx] = useState(line.length - 1);
  const [chess, setChess] = useState<Chess>(() =>
    line.length ? new Chess(line[line.length - 1].fen) : new Chess(initialFen ?? undefined)
  );
  const [history, setHistory] = useState<{ chess: Chess; lastMove: LastMove }[]>([]);
  const [flipped, setFlipped] = useState(() => initialPlayerColor === 'b');
  const [lastMove, setLastMove] = useState<LastMove>(() => line.length ? line[line.length - 1].lastMove : null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [hintDestSquare, setHintDestSquare] = useState<Square | null>(null);

  const fen = chess.fen();
  const { isAnalyzing, evalScore, arrows, bestMove } = useEngineAnalysis(fen);
  const gameOverMsg = gameOverMessage(chess);

  const clearHint = () => {
    setHintSquare(null);
    setHintDestSquare(null);
    setHintLevel(0);
  };

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    const c = new Chess(chess.fen());
    let result;
    try { result = c.move({ from, to, promotion }); } catch { return false; }
    if (!result) return false;
    playMoveSound(result);

    setHistory(h => [...h, { chess, lastMove }]);
    setChess(c);
    setLastMove({ from, to });
    clearHint();
    return true;
  }, [chess, lastMove]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setChess(prev.chess);
    setLastMove(prev.lastMove);
    clearHint();
  };

  const handleHint = async () => {
    const move = await bestMove();
    if (!move) return;
    const from = move.slice(0, 2) as Square;
    const to = move.slice(2, 4) as Square;
    setHintSquare(from);
    if (hintLevel === 0) {
      setHintDestSquare(null);
      setHintLevel(1);
    } else {
      setHintDestSquare(to);
      setHintLevel(2);
    }
  };

  const navigateLine = (idx: number) => {
    if (idx < 0 || idx >= line.length) return;
    setLineIdx(idx);
    setHistory([]);
    setChess(new Chess(line[idx].fen));
    setLastMove(line[idx].lastMove);
    clearHint();
  };

  const { whiteAdvantage, label: evalLabel } = evalBar(evalScore);

  return (
    <div className="flex flex-col items-center gap-2 py-2 px-3">
      <div className="flex items-center justify-between w-full max-w-[480px] px-1">
        <div className="text-sm font-semibold text-gray-700">
          Analysis {isAnalyzing && <span className="text-gray-400 font-normal">(thinking…)</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={handleUndo} disabled={history.length === 0} className="text-sm px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
            Undo
          </button>
          <button onClick={() => setFlipped(f => !f)} className="text-sm px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Flip
          </button>
        </div>
      </div>

      <div className="w-full max-w-[480px] flex items-center gap-2">
        <span className="text-xs text-gray-500 w-10 text-right">{evalLabel}</span>
        <div className="flex-1 h-4 rounded-full overflow-hidden flex border border-gray-200">
          <div style={{ width: `${whiteAdvantage}%`, background: '#ffffff', flexShrink: 0, transition: 'width 300ms' }}/>
          <div style={{ flex: 1, background: '#000000' }}/>
        </div>
      </div>

      <ChessBoard
        chess={chess}
        flipped={flipped}
        theme={settings.boardTheme}
        onMove={handleMove}
        arrows={arrows}
        hintSquare={hintSquare}
        hintDestSquare={hintDestSquare}
        lastMove={lastMove}
      />

      {gameOverMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-blue-700 text-sm font-medium max-w-[480px] w-full text-center">
          {gameOverMsg}
        </div>
      )}

      {line.length > 0 && (
        <div className="flex items-center gap-2 max-w-[480px] w-full justify-center">
          <button onClick={() => navigateLine(0)} disabled={lineIdx <= 0} aria-label="First move" className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-lg px-1">⏮</button>
          <button onClick={() => navigateLine(lineIdx - 1)} disabled={lineIdx <= 0} aria-label="Previous move" className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-lg px-1">◀</button>
          <span className="text-sm text-gray-500 min-w-[80px] text-center">
            {lineIdx === 0 ? 'Start' : lineIdx === line.length - 1 ? 'End' : `Move ${lineIdx}/${line.length - 1}`}
          </span>
          <button onClick={() => navigateLine(lineIdx + 1)} disabled={lineIdx >= line.length - 1} aria-label="Next move" className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-lg px-1">▶</button>
          <button onClick={() => navigateLine(line.length - 1)} disabled={lineIdx >= line.length - 1} aria-label="Last move" className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-lg px-1">⏭</button>
        </div>
      )}

      <div className="flex gap-2 max-w-[480px] w-full">
        <button onClick={handleHint} disabled={!!gameOverMsg} className="flex-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40">
          Hint {hintLevel > 0 ? `(${hintLevel}/2)` : ''}
        </button>
        {onPlayFromHere && (
          <button onClick={() => onPlayFromHere(chess.fen(), chess.turn())} disabled={!!gameOverMsg} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40">
            Play from here
          </button>
        )}
      </div>
    </div>
  );
}
