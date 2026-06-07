'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard, { Arrow } from './ChessBoard';
import { AppSettings } from '@/lib/types';
import { useStockfish } from '@/hooks/useStockfish';

interface Props {
  settings: AppSettings;
  initialFen?: string;
  initialMoves?: string[];
  initialPlayerColor?: 'w' | 'b';
  onPlayFromHere?: (fen: string, color: 'w' | 'b') => void;
}

export default function AnalyzeMode({ settings, initialFen, initialMoves, initialPlayerColor, onPlayFromHere }: Props) {
  const [chess, setChess] = useState<Chess>(() => {
    const c = new Chess(initialFen ?? undefined);
    if (initialFen && initialMoves) {
      for (const uci of initialMoves) {
        try { c.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4] }); } catch { break; }
      }
    }
    return c;
  });
  const [history, setHistory] = useState<Chess[]>([]);
  const [flipped, setFlipped] = useState(() => initialPlayerColor === 'b');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [evalScore, setEvalScore] = useState<string>('0');
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [hintDestSquare, setHintDestSquare] = useState<Square | null>(null);
  const [checkmateMsg, setCheckmateMsg] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const puzzleHistoryRef = useRef<Chess[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const { getBestMove, isReady } = useStockfish();

  const runAnalysis = useCallback(async (c: Chess) => {
    if (c.isCheckmate() || c.isStalemate() || c.isDraw()) return;
    setIsAnalyzing(true);
    try {
      const result = await getBestMove(c.fen(), 800);
      setEvalScore(result.score);
      const pvArrows: Arrow[] = result.pv.slice(0, 5).map((uci, i) => ({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        color: '#3b82f6',
        opacity: Math.max(0.25, 0.82 - i * 0.14),
      }));
      setArrows(pvArrows);
    } finally {
      setIsAnalyzing(false);
    }
  }, [getBestMove]);

  useEffect(() => {
    if (initialFen && initialMoves) {
      const snapshots: Chess[] = [];
      const c = new Chess(initialFen);
      const blunder = initialMoves[0];
      c.move({ from: blunder.slice(0, 2) as Square, to: blunder.slice(2, 4) as Square, promotion: blunder[4] });
      snapshots.push(new Chess(c.fen()));
      for (let i = 1; i < initialMoves.length; i++) {
        const uci = initialMoves[i];
        try { c.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4] }); } catch { break; }
        snapshots.push(new Chess(c.fen()));
      }
      puzzleHistoryRef.current = snapshots;
      historyIndexRef.current = snapshots.length - 1;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isReady) runAnalysis(chess);
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    const c = new Chess(chess.fen());
    const result = c.move({ from, to, promotion });
    if (!result) return false;

    setHistory(h => [...h, chess]);
    setChess(c);
    setLastMove({ from, to });
    setHintSquare(null);
    setHintDestSquare(null);
    setHintLevel(0);
    setArrows([]);
    runAnalysis(c);
    if (c.isCheckmate()) setCheckmateMsg(c.turn() === 'w' ? 'Black wins by checkmate!' : 'White wins by checkmate!');
    return true;
  }, [chess, runAnalysis]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setChess(prev);
    setLastMove(null);
    setHintSquare(null);
    setHintDestSquare(null);
    setHintLevel(0);
    setCheckmateMsg(null);
    runAnalysis(prev);
  };

  const handleHint = useCallback(async () => {
    const result = await getBestMove(chess.fen(), 600);
    if (!result.bestMove) return;
    const from = result.bestMove.slice(0, 2) as Square;
    const to = result.bestMove.slice(2, 4) as Square;
    if (hintLevel === 0) {
      setHintSquare(from);
      setHintDestSquare(null);
      setHintLevel(1);
    } else {
      setHintSquare(from);
      setHintDestSquare(to);
      setHintLevel(2);
    }
  }, [chess, getBestMove, hintLevel]);

  const evalNum = parseFloat(evalScore.replace('M', '')) || 0;
  const isMate = evalScore.includes('M');
  const whiteAdvantage = isMate
    ? (evalScore.startsWith('-') ? 0 : 100)
    : Math.min(100, Math.max(0, 50 + evalNum / 10));

  const puzzleHistory = puzzleHistoryRef.current;
  const histIdx = historyIndexRef.current;

  const navigatePuzzle = (idx: number) => {
    if (idx < 0 || idx >= puzzleHistory.length) return;
    historyIndexRef.current = idx;
    const snap = puzzleHistory[idx];
    setHistory([]);
    setChess(new Chess(snap.fen()));
    setLastMove(null);
    setHintSquare(null);
    setHintDestSquare(null);
    setHintLevel(0);
    setArrows([]);
    setCheckmateMsg(null);
    runAnalysis(snap);
  };

  const evalLabel = isMate
    ? evalScore
    : `${evalNum > 0 ? '+' : ''}${(evalNum / 100).toFixed(2)}`;

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
          <button onClick={() => setFlipped(f => !f)} className="text-sm px-3 py-1 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">
            Flip
          </button>
        </div>
      </div>

      <div className="w-full max-w-[480px] flex items-center gap-2">
        <span className="text-xs text-gray-500 w-10 text-right">{evalLabel}</span>
        <div className="flex-1 h-4 rounded-full overflow-hidden flex">
          <div style={{ width: `${whiteAdvantage}%`, background: '#ffffff', flexShrink: 0 }}/>
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

      {checkmateMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-blue-700 text-sm font-medium max-w-[480px] w-full text-center">
          {checkmateMsg}
        </div>
      )}

      {puzzleHistory.length > 0 && (
        <div className="flex items-center gap-2 max-w-[480px] w-full justify-center">
          <button onClick={() => navigatePuzzle(0)} disabled={histIdx <= 0} className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-lg px-1">⏮</button>
          <button onClick={() => navigatePuzzle(histIdx - 1)} disabled={histIdx <= 0} className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-lg px-1">◀</button>
          <span className="text-sm text-gray-500 min-w-[80px] text-center">
            {histIdx === 0 ? 'Start' : histIdx === puzzleHistory.length - 1 ? 'End' : `Move ${histIdx}/${puzzleHistory.length - 1}`}
          </span>
          <button onClick={() => navigatePuzzle(histIdx + 1)} disabled={histIdx >= puzzleHistory.length - 1} className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-lg px-1">▶</button>
          <button onClick={() => navigatePuzzle(puzzleHistory.length - 1)} disabled={histIdx >= puzzleHistory.length - 1} className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-lg px-1">⏭</button>
        </div>
      )}

      <div className="flex gap-2 max-w-[480px] w-full">
        <button onClick={handleHint} className="flex-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl py-2 text-sm font-medium transition-colors">
          Hint {hintLevel > 0 ? `(${hintLevel}/2)` : ''}
        </button>
        {onPlayFromHere && (
          <button onClick={() => onPlayFromHere(chess.fen(), chess.turn())} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-medium transition-colors">
            Play from here
          </button>
        )}
      </div>
    </div>
  );
}
