'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import type { Arrow } from '@/components/ChessBoard';
import { useStockfish, StockfishResult } from './useStockfish';

// Flip the sign of a Stockfish score string ("45", "-45", "M3", "-M3").
function negateScore(s: string): string {
  if (!s || s === '0') return s;
  return s.startsWith('-') ? s.slice(1) : `-${s}`;
}

interface Analysis {
  fen: string;
  score: string;
  arrows: Arrow[];
}

// Continuously evaluates `fen` with a dedicated Stockfish worker. Results are
// keyed by FEN so a slow answer for an old position can never be shown on a
// newer one. `bestMove()` reuses the in-flight (or finished) search for the
// current position rather than starting a second one, which would otherwise
// cancel the running evaluation and leave it hanging.
export function useEngineAnalysis(fen: string, movetime = 800) {
  const { getBestMove, isReady } = useStockfish();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const searchRef = useRef<{ fen: string; promise: Promise<StockfishResult> } | null>(null);

  const search = useCallback((f: string) => {
    if (searchRef.current?.fen === f) return searchRef.current.promise;
    const promise = getBestMove(f, movetime);
    searchRef.current = { fen: f, promise };
    return promise;
  }, [getBestMove, movetime]);

  const chess = new Chess(fen);
  const isMate = chess.isCheckmate();
  const isOver = isMate || chess.isStalemate() || chess.isDraw();
  const sideToMove = chess.turn();

  useEffect(() => {
    if (!isReady || isOver) return;
    let cancelled = false;
    search(fen).then(result => {
      if (cancelled) return;
      // Stockfish reports the score relative to the side to move. Normalize
      // it so the eval bar is always from White's perspective.
      const score = sideToMove === 'b' ? negateScore(result.score) : result.score;
      const arrows: Arrow[] = result.pv.slice(0, 5).map((uci, i) => ({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        color: '#3b82f6',
        opacity: Math.max(0.25, 0.82 - i * 0.14),
      }));
      setAnalysis({ fen, score, arrows });
    });
    return () => { cancelled = true; };
  }, [fen, isReady, isOver, sideToMove, search]);

  const bestMove = useCallback(async (): Promise<string> => {
    if (isOver) return '';
    return (await search(fen)).bestMove;
  }, [fen, isOver, search]);

  const isCurrent = analysis?.fen === fen;
  // Keep showing the previous score while the new one is computed so the bar
  // slides instead of snapping back to 0.
  const evalScore = isOver
    ? (isMate ? (sideToMove === 'w' ? '-M0' : 'M0') : '0')
    : (analysis?.score ?? '0');

  return {
    isReady,
    isAnalyzing: isReady && !isOver && !isCurrent,
    evalScore,
    arrows: !isOver && isCurrent ? analysis.arrows : [],
    bestMove,
  };
}

// Eval bar fill (White's share, 0-100) and label for a normalized score.
export function evalBar(evalScore: string): { whiteAdvantage: number; label: string } {
  const isMate = evalScore.includes('M');
  const evalNum = parseFloat(evalScore.replace('M', '')) || 0;
  if (isMate) {
    const whiteAdvantage = evalScore.startsWith('-') ? 0 : 100;
    return { whiteAdvantage, label: evalNum === 0 ? '#' : evalScore };
  }
  return {
    whiteAdvantage: Math.min(100, Math.max(0, 50 + evalNum / 10)),
    label: `${evalNum > 0 ? '+' : ''}${(evalNum / 100).toFixed(2)}`,
  };
}
