'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { Puzzle, AppSettings, DayStats, themeLabel } from '@/lib/types';
import { BoardLayout, Panel, Status, Stat } from './ui';
import { BulbIcon, EyeIcon, FlipIcon, RetryIcon, ArrowRightIcon, CheckIcon, XIcon, MicroscopeIcon, FilterIcon, TargetIcon, FlameIcon } from './Icons';
import { saveResult } from '@/lib/storage';

interface Props {
  settings: AppSettings;
  dayStats: DayStats;
  onDayStatsChange: (s: DayStats) => void;
  onAnalyze?: (fen: string, moves: string[], playerColor: 'w' | 'b') => void;
  onOpenSettings?: () => void;
}

type PuzzleState = 'solving' | 'correct' | 'failed' | 'complete';

export default function PuzzleMode({ settings, dayStats, onDayStatsChange, onAnalyze, onOpenSettings }: Props) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [chess, setChess] = useState<Chess>(new Chess());
  const [moveIndex, setMoveIndex] = useState(0);
  const [state, setState] = useState<PuzzleState>('solving');
  const [hintLevel, setHintLevel] = useState(0);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [hintDestSquare, setHintDestSquare] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [checkmateMsg, setCheckmateMsg] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [loadError, setLoadError] = useState(false);
  const [errorSquare, setErrorSquare] = useState<Square | null>(null);
  // Consecutive clean solves this session.
  const [streak, setStreak] = useState(0);
  const [solvedClean, setSolvedClean] = useState(false);
  const usedHintRef = useRef(false);
  const scoredRef = useRef(false);
  const solutionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearSolutionTimers = useCallback(() => {
    solutionTimersRef.current.forEach(clearTimeout);
    solutionTimersRef.current = [];
  }, []);

  // Cancel any in-flight solution animation / opponent reply on unmount.
  useEffect(() => () => clearSolutionTimers(), [clearSolutionTimers]);

  // Records the outcome of the current puzzle exactly once. Using a hint (or
  // revealing the solution) downgrades a solve to a fail.
  const recordResult = useCallback((solved: boolean) => {
    if (!puzzle || scoredRef.current) return;
    scoredRef.current = true;
    const success = solved && !usedHintRef.current;
    setSolvedClean(success);
    setStreak(n => success ? n + 1 : 0);
    // Save the result first: the parent reloads all-time stats on change.
    saveResult({ puzzleId: puzzle.id, solved: success, usedHint: usedHintRef.current });
    // Start a fresh tally if the app was left open past midnight.
    const today = new Date().toISOString().slice(0, 10);
    const base: DayStats = dayStats.date === today ? dayStats : { date: today, correct: 0, incorrect: 0, played: 0 };
    const newStats: DayStats = {
      ...base,
      correct: base.correct + (success ? 1 : 0),
      incorrect: base.incorrect + (success ? 0 : 1),
      played: base.played + 1,
    };
    onDayStatsChange(newStats);
  }, [puzzle, dayStats, onDayStatsChange]);

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
    setShowSolution(false);
    setCheckmateMsg(null);
    setErrorSquare(null);
    setSolvedClean(false);
    usedHintRef.current = false;
    scoredRef.current = false;
    setFlipped(c.turn() === 'b');
    setPlayerColor(c.turn());
  }, []);

  useEffect(() => {
    fetch('/puzzles.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Puzzle[]) => {
        setPuzzles(data);
        if (data.length > 0) loadPuzzle(data, settings);
      })
      .catch(() => setLoadError(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    if (!puzzle || state !== 'solving' || chess.turn() !== playerColor) return false;
    const expected = puzzle.moves[moveIndex];
    const uci = `${from}${to}${promotion ?? ''}`;
    const expectedNorm = expected.length === 5 ? expected : expected.slice(0, 4);
    const uciNorm = uci.length === 5 ? uci : uci.slice(0, 4);

    if (uciNorm !== expectedNorm) {
      setErrorSquare(to);
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
    const t = setTimeout(() => {
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
    solutionTimersRef.current.push(t);

    return true;
  }, [puzzle, state, moveIndex, chess, playerColor, recordResult]);

  // The opponent's scripted reply is still on its way.
  const opponentReplying = state === 'solving' && chess.turn() !== playerColor;

  const handleHint = () => {
    if (!puzzle || state !== 'solving' || opponentReplying) return;
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
    if (!puzzle || opponentReplying) return;
    usedHintRef.current = true;
    recordResult(false);
    setState('complete');
    setHintSquare(null);
    setHintDestSquare(null);
    setErrorSquare(null);
    setShowSolution(true);

    // Precompute each frame of the remaining solution, starting from the
    // current position (the move the user missed).
    const c = new Chess(chess.fen());
    const frames: { fen: string; from: Square; to: Square; mate: boolean }[] = [];
    for (const uci of puzzle.moves.slice(moveIndex)) {
      const from = uci.slice(0, 2) as Square;
      const to = uci.slice(2, 4) as Square;
      const result = c.move({ from, to, promotion: uci[4] });
      if (!result) break;
      frames.push({ fen: c.fen(), from, to, mate: c.isCheckmate() });
    }

    // Play them out on the board one at a time, slow enough to follow.
    const STEP_MS = 1000;
    clearSolutionTimers();
    frames.forEach((f, i) => {
      const t = setTimeout(() => {
        setChess(new Chess(f.fen));
        setLastMove({ from: f.from, to: f.to });
        if (f.mate) setCheckmateMsg('Checkmate!');
        if (i === frames.length - 1) setShowSolution(false);
      }, STEP_MS * (i + 1));
      solutionTimersRef.current.push(t);
    });
  };

  const handleRetry = () => {
    if (!puzzle) return;
    clearSolutionTimers();
    // A wrong move is never applied to the board, so `chess` and `moveIndex`
    // are already at the position of the move the user missed. Just restore
    // the solving state so they can retry that exact move.
    setState('solving');
    setHintLevel(0);
    setHintSquare(null);
    setHintDestSquare(null);
    setShowSolution(false);
    setCheckmateMsg(null);
    setErrorSquare(null);
  };

  const handleNextPuzzle = () => {
    clearSolutionTimers();
    if (puzzles.length > 0) loadPuzzle(puzzles, settings);
  };

  if (!puzzle) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className={`flex items-center gap-3 ${loadError ? 'text-danger' : 'text-muted'}`}>
          {!loadError && <span className="w-5 h-5 rounded-full border-2 border-line-strong border-t-accent animate-spin"/>}
          {loadError ? "Couldn't load puzzles. Check your connection and refresh." : 'Loading puzzles…'}
        </div>
      </div>
    );
  }

  const sideName = playerColor === 'w' ? 'White' : 'Black';
  const accuracy = dayStats.played > 0 ? Math.round((dayStats.correct / dayStats.played) * 100) : null;
  const ratingRange = `${settings.minRating}–${settings.maxRating}`;
  const filtered = settings.puzzleThemes.length > 0;

  let status: React.ReactNode;
  if (showSolution) {
    status = <Status tone="info" icon={<EyeIcon/>} title="Playing the solution">Watch the board.</Status>;
  } else if (state === 'failed') {
    status = <Status tone="danger" icon={<XIcon/>} title="Not quite">That isn’t the best move. Try again or see the solution.</Status>;
  } else if (state === 'complete') {
    status = solvedClean
      ? <Status tone="success" icon={<CheckIcon/>} title={checkmateMsg ?? 'Solved!'}>{streak > 1 ? `${streak} in a row. Keep it going.` : 'Nicely done.'}</Status>
      : <Status tone="neutral" icon={<CheckIcon/>} title={checkmateMsg ?? 'Puzzle complete'}>Counted as a miss this time. On to the next one.</Status>;
  } else if (opponentReplying) {
    status = <Status tone="success" icon={<CheckIcon/>} title="Good move!">Keep going…</Status>;
  } else {
    status = (
      <Status tone="accent" icon={<span className={`w-5 h-5 rounded-full border-2 ${playerColor === 'w' ? 'bg-white border-[#999]' : 'bg-[#222] border-[#222]'}`}/>} title="Your turn">
        Find the best move for {sideName}.
      </Status>
    );
  }

  const boardCol = (
    <>
      <div className="flex items-center justify-between px-1 h-9">
        <div className="flex items-center gap-2">
          <span className="chip font-semibold"><TargetIcon size={14}/> {puzzle.rating}</span>
          {hintLevel > 0 && state === 'solving' && <span className="chip bg-accent-soft text-accent-soft-fg">Hint {hintLevel}/2</span>}
        </div>
        <button onClick={() => setFlipped(f => !f)} className="btn btn-ghost btn-icon" aria-label="Flip board" title="Flip board">
          <FlipIcon size={18}/>
        </button>
      </div>
      <ChessBoard
        chess={chess}
        flipped={flipped}
        theme={settings.boardTheme}
        onMove={handleMove}
        disabled={state !== 'solving' || opponentReplying}
        hintSquare={hintSquare}
        hintDestSquare={hintDestSquare}
        lastMove={lastMove}
        errorSquare={state === 'failed' ? errorSquare : null}
      />
    </>
  );

  const panel = (
    <>
      {status}

      <div className="grid grid-cols-2 gap-2">
        {state === 'solving' && (
          <>
            <button onClick={handleHint} disabled={opponentReplying || hintLevel >= 2} className="btn btn-soft h-12">
              <BulbIcon size={18}/> {hintLevel === 0 ? 'Hint' : hintLevel === 1 ? 'Show target' : 'Hint shown'}
            </button>
            <button onClick={handleShowSolution} disabled={opponentReplying} className="btn btn-secondary h-12">
              <EyeIcon size={18}/> Solution
            </button>
          </>
        )}
        {state === 'failed' && (
          <>
            <button onClick={handleRetry} className="btn btn-primary h-12">
              <RetryIcon size={18}/> Try again
            </button>
            <button onClick={handleShowSolution} className="btn btn-secondary h-12">
              <EyeIcon size={18}/> Solution
            </button>
          </>
        )}
        {state === 'complete' && (
          <>
            <button onClick={handleNextPuzzle} disabled={showSolution} className="btn btn-primary h-12 col-span-2 text-base">
              Next puzzle <ArrowRightIcon size={18}/>
            </button>
            <button
              onClick={() => onAnalyze?.(puzzle.fen, puzzle.moves, flipped ? 'b' : 'w')}
              disabled={showSolution}
              className="btn btn-secondary col-span-2"
            >
              <MicroscopeIcon size={18}/> Analyze this position
            </button>
          </>
        )}
      </div>

      {state === 'complete' && !showSolution && puzzle.themes.length > 0 && (
        <Panel title="Themes">
          <div className="px-4 pb-4 flex flex-wrap gap-1.5">
            {puzzle.themes.map(t => <span key={t} className="chip">{themeLabel(t)}</span>)}
          </div>
        </Panel>
      )}

      <Panel
        title="Today"
        action={streak > 0 ? <span className="chip bg-accent-soft text-accent-soft-fg font-semibold"><FlameIcon size={14}/> {streak} streak</span> : null}
      >
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Solved" value={dayStats.correct} tone="success"/>
            <Stat label="Missed" value={dayStats.incorrect} tone="danger"/>
            <Stat label="Accuracy" value={accuracy === null ? '–' : `${accuracy}%`}/>
          </div>
          {dayStats.played > 0 && (
            <div className="mt-3 h-1.5 rounded-full bg-danger-soft overflow-hidden">
              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${(dayStats.correct / dayStats.played) * 100}%` }}/>
            </div>
          )}
        </div>
      </Panel>

      <button onClick={onOpenSettings} className="card px-4 py-3 flex items-center gap-3 text-left hover:border-line-strong transition-colors">
        <span className="w-9 h-9 rounded-lg bg-surface-2 text-muted flex items-center justify-center"><FilterIcon size={18}/></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-fg">Difficulty {ratingRange}</span>
          <span className="block text-xs text-subtle truncate">{filtered ? `${settings.puzzleThemes.length} puzzle types selected` : 'All puzzle types'} · Change</span>
        </span>
      </button>
    </>
  );

  return <BoardLayout board={boardCol} panel={panel}/>;
}
