'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { Puzzle, AppSettings, DayStats } from '@/lib/types';
import { saveResult } from '@/lib/storage';

interface Props {
  settings: AppSettings;
  dayStats: DayStats;
  onDayStatsChange: (s: DayStats) => void;
  onAnalyze?: (fen: string, moves: string[], playerColor: 'w' | 'b') => void;
}

type PuzzleState = 'solving' | 'correct' | 'failed' | 'complete';

export default function PuzzleMode({ settings, dayStats, onDayStatsChange, onAnalyze }: Props) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [chess, setChess] = useState<Chess>(new Chess());
  const [moveIndex, setMoveIndex] = useState(0);
  const [state, setState] = useState<PuzzleState>('solving');
  const [hintLevel, setHintLevel] = useState(0);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [hintDestSquare, setHintDestSquare] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [checkmateMsg, setCheckmateMsg] = useState<string | null>(null);
  const usedHintRef = useRef(false);
  const scoredRef = useRef(false);

  // Records the outcome of the current puzzle exactly once. Using a hint (or
  // revealing the solution) downgrades a solve to a fail.
  const recordResult = useCallback((solved: boolean) => {
    if (!puzzle || scoredRef.current) return;
    scoredRef.current = true;
    const success = solved && !usedHintRef.current;
    const newStats: DayStats = {
      ...dayStats,
      correct: dayStats.correct + (success ? 1 : 0),
      incorrect: dayStats.incorrect + (success ? 0 : 1),
      played: dayStats.played + 1,
    };
    onDayStatsChange(newStats);
    saveResult({ puzzleId: puzzle.id, solved: success, usedHint: usedHintRef.current });
  }, [puzzle, dayStats, onDayStatsChange]);

  useEffect(() => {
    fetch('/puzzles.json')
      .then(r => r.json())
      .then((data: Puzzle[]) => setPuzzles(data));
  }, []);

  const loadPuzzle = useCallback((list: Puzzle[], cfg: AppSettings) => {
    let filtered = list.filter(p =>
      p.rating >= cfg.minRating && p.rating <= cfg.maxRating
    );
    if (cfg.puzzleThemes.length > 0) {
      filtered = filtered.filter(p => p.themes.some(t => cfg.puzzleThemes.includes(t)));
    }
    if (filtered.length === 0) filtered = list;
    const p = filtered[Math.floor(Math.random() * filtered.length)];
    const c = new Chess(p.fen);

    const blunder = p.moves[0];
    c.move({ from: blunder.slice(0, 2) as Square, to: blunder.slice(2, 4) as Square, promotion: blunder[4] });
    const from = blunder.slice(0, 2) as Square;
    const to = blunder.slice(2, 4) as Square;

    setPuzzle(p);
    setChess(c);
    setMoveIndex(1);
    setState('solving');
    setHintLevel(0);
    setHintSquare(null);
    setHintDestSquare(null);
    setLastMove({ from, to });
    setSolutionMoves([]);
    setShowSolution(false);
    setCheckmateMsg(null);
    usedHintRef.current = false;
    scoredRef.current = false;
    setFlipped(c.turn() === 'b');
  }, []);

  useEffect(() => {
    if (puzzles.length > 0) loadPuzzle(puzzles, settings);
  }, [puzzles]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    if (!puzzle || state !== 'solving') return false;
    const expected = puzzle.moves[moveIndex];
    const uci = `${from}${to}${promotion ?? ''}`;
    const expectedNorm = expected.length === 5 ? expected : expected.slice(0, 4);
    const uciNorm = uci.length === 5 ? uci : uci.slice(0, 4);

    if (uciNorm !== expectedNorm) {
      setState('failed');
      recordResult(false);
      return false;
    }

    const c = new Chess(chess.fen());
    c.move({ from, to, promotion: promotion ?? (expected[4] as string | undefined) });
    setLastMove({ from, to });
    setHintSquare(null);
    setHintDestSquare(null);

    const nextIndex = moveIndex + 1;

    if (nextIndex >= puzzle.moves.length) {
      setChess(c);
      setMoveIndex(nextIndex);
      setState('complete');
      recordResult(true);
      if (c.isCheckmate()) setCheckmateMsg("Brilliant — you delivered checkmate!");
      return true;
    }

    setChess(c);
    setMoveIndex(nextIndex);

    const opponentMove = puzzle.moves[nextIndex];
    setTimeout(() => {
      const c2 = new Chess(c.fen());
      const oFrom = opponentMove.slice(0, 2) as Square;
      const oTo = opponentMove.slice(2, 4) as Square;
      c2.move({ from: oFrom, to: oTo, promotion: opponentMove[4] });
      setLastMove({ from: oFrom, to: oTo });
      setChess(c2);
      setMoveIndex(nextIndex + 1);
      if (nextIndex + 1 >= puzzle.moves.length) {
        setState('complete');
        recordResult(true);
        if (c2.isCheckmate()) setCheckmateMsg("Brilliant — you delivered checkmate!");
      }
    }, 600);

    return true;
  }, [puzzle, state, moveIndex, chess, recordResult]);

  const handleHint = () => {
    if (!puzzle || state !== 'solving') return;
    usedHintRef.current = true;
    const move = puzzle.moves[moveIndex];
    const from = move.slice(0, 2) as Square;
    const to = move.slice(2, 4) as Square;
    if (hintLevel === 0) {
      setHintSquare(from);
      setHintDestSquare(null);
      setHintLevel(1);
    } else {
      setHintSquare(from);
      setHintDestSquare(to);
      setHintLevel(2);
    }
  };

  const handleShowSolution = () => {
    if (!puzzle) return;
    usedHintRef.current = true;
    const remaining = puzzle.moves.slice(moveIndex);
    const c = new Chess(chess.fen());
    const sans: string[] = [];
    for (const uci of remaining) {
      const result = c.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4] });
      if (result) sans.push(result.san);
    }
    setSolutionMoves(sans);
    setShowSolution(true);
    setState('complete');
    recordResult(false);
  };

  const handleRetry = () => {
    if (!puzzle) return;
    const c = new Chess(puzzle.fen);
    const blunder = puzzle.moves[0];
    c.move({ from: blunder.slice(0, 2) as Square, to: blunder.slice(2, 4) as Square, promotion: blunder[4] });
    setChess(c);
    setMoveIndex(1);
    setState('solving');
    setHintLevel(0);
    setHintSquare(null);
    setHintDestSquare(null);
    setLastMove({ from: blunder.slice(0, 2) as Square, to: blunder.slice(2, 4) as Square });
    setSolutionMoves([]);
    setShowSolution(false);
    setCheckmateMsg(null);
  };

  const handleNextPuzzle = () => {
    if (puzzles.length > 0) loadPuzzle(puzzles, settings);
  };

  if (!puzzle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Loading puzzles…</div>
      </div>
    );
  }

  const turnLabel = chess.turn() === 'w' ? 'White' : 'Black';
  const statusMsg = state === 'solving'
    ? `${turnLabel} to move`
    : state === 'correct' ? 'Correct!' : state === 'failed' ? 'Incorrect' : 'Puzzle Complete!';
  const statusColor = state === 'solving' ? 'text-gray-700' : state === 'complete' ? 'text-green-600' : state === 'failed' ? 'text-red-500' : 'text-green-600';

  return (
    <div className="flex flex-col items-center gap-2 py-2 px-3">
      <div className="flex items-center justify-between w-full max-w-[480px] px-1">
        <div>
          <div className={`text-lg font-semibold ${statusColor}`}>{statusMsg}</div>
          <div className="text-xs text-gray-400">Rating: {puzzle.rating}</div>
        </div>
        <button onClick={() => setFlipped(f => !f)} className="text-gray-400 hover:text-gray-600 transition-colors text-sm px-2 py-1 rounded border border-gray-200">
          Flip
        </button>
      </div>

      <ChessBoard
        chess={chess}
        flipped={flipped}
        theme={settings.boardTheme}
        onMove={handleMove}
        disabled={state !== 'solving'}
        hintSquare={hintSquare}
        hintDestSquare={hintDestSquare}
        lastMove={lastMove}
      />

      {checkmateMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 font-medium text-center max-w-[480px] w-full">
          Checkmate! {checkmateMsg}
        </div>
      )}

      {showSolution && solutionMoves.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 max-w-[480px] w-full">
          <div className="text-sm font-medium text-gray-600 mb-1">Solution:</div>
          <div className="text-sm text-gray-800">{solutionMoves.join(' → ')}</div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center max-w-[480px] w-full">
        {state === 'solving' && (
          <>
            <button onClick={handleHint} className="flex-1 min-w-[80px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl py-2 px-4 text-sm font-medium transition-colors">
              Hint {hintLevel > 0 ? `(${hintLevel}/2)` : ''}
            </button>
            <button onClick={handleShowSolution} className="flex-1 min-w-[80px] bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl py-2 px-4 text-sm font-medium transition-colors">
              Solution
            </button>
          </>
        )}
        {state === 'failed' && (
          <>
            <button onClick={handleRetry} className="flex-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl py-2 px-4 text-sm font-medium transition-colors">
              Retry
            </button>
            <button onClick={handleShowSolution} className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl py-2 px-4 text-sm font-medium transition-colors">
              Solution
            </button>
          </>
        )}
        {(state === 'complete') && (
          <>
            <button onClick={handleNextPuzzle} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2 px-4 text-sm font-medium transition-colors">
              Next Puzzle
            </button>
            <button onClick={() => onAnalyze?.(puzzle.fen, puzzle.moves, flipped ? 'b' : 'w')} className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl py-2 px-4 text-sm font-medium transition-colors">
              Analyze
            </button>
          </>
        )}
      </div>

      <div className="max-w-[480px] w-full bg-white border border-gray-200 rounded-2xl p-4">
        <div className="grid grid-cols-3 gap-3 text-center mb-3">
          <div>
            <div className="text-2xl font-bold text-green-600">{dayStats.correct}</div>
            <div className="text-xs text-gray-400 mt-0.5">Correct</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{dayStats.incorrect}</div>
            <div className="text-xs text-gray-400 mt-0.5">Incorrect</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">{dayStats.played}</div>
            <div className="text-xs text-gray-400 mt-0.5">Played</div>
          </div>
        </div>
        {dayStats.played > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-red-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(dayStats.correct / dayStats.played) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 w-9 text-right">
              {Math.round((dayStats.correct / dayStats.played) * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
