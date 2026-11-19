'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { AppSettings } from '@/lib/types';
import { useEngineAnalysis, evalBar } from '@/hooks/useEngineAnalysis';
import { BoardLayout, Panel, EvalBar, MoveList, useArrowKeys } from './ui';
import {
  BulbIcon, FlipIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon,
  ResetIcon, ClipboardIcon,
} from './Icons';

interface Props {
  settings: AppSettings;
  active?: boolean;
  initialFen?: string;
  initialMoves?: string[]; // UCI
  initialPlayerColor?: 'w' | 'b';
  onPlayFromHere?: (fen: string, color: 'w' | 'b') => void;
}

type LastMove = { from: Square; to: Square } | null;
type Move = { san: string; from: Square; to: Square; promotion?: string };

const START_FEN = new Chess().fen();

// Turn a UCI line (from a puzzle or a finished game) into SAN moves.
function buildMoves(fen: string, uciMoves?: string[]): Move[] {
  if (!uciMoves?.length) return [];
  const c = new Chess(fen);
  const out: Move[] = [];
  for (const uci of uciMoves) {
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci[4];
    try {
      const r = c.move({ from, to, promotion });
      out.push({ san: r.san, from, to, promotion });
    } catch { break; }
  }
  return out;
}

function gameOverMessage(c: Chess): string | null {
  if (c.isCheckmate()) return c.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
  if (c.isStalemate()) return 'Stalemate';
  if (c.isDraw()) return 'Draw';
  return null;
}

// Plain-language summary of a White-relative score ("45", "-M3"…).
function describeEval(score: string): string {
  if (score.includes('M')) {
    const n = Math.abs(parseInt(score.replace('M', ''), 10)) || 0;
    const side = score.startsWith('-') ? 'Black' : 'White';
    return n === 0 ? 'Checkmate' : `${side} mates in ${n}`;
  }
  const cp = parseFloat(score) || 0;
  const side = cp > 0 ? 'White' : 'Black';
  const a = Math.abs(cp);
  if (a < 50) return 'About equal';
  if (a < 150) return `${side} is slightly better`;
  if (a < 400) return `${side} is better`;
  return `${side} is winning`;
}

function pvToSan(fen: string, pv: string[], max = 8): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      out.push(c.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4] }).san);
    } catch { break; }
  }
  return out;
}

export default function AnalyzeMode({ settings, active = true, initialFen, initialMoves, initialPlayerColor, onPlayFromHere }: Props) {
  const [startFen, setStartFen] = useState(() => {
    try { return new Chess(initialFen).fen(); } catch { return START_FEN; }
  });
  const [moves, setMoves] = useState<Move[]>(() => buildMoves(initialFen ?? START_FEN, initialMoves));
  const [ply, setPly] = useState(() => moves.length);
  const [flipped, setFlipped] = useState(() => initialPlayerColor === 'b');
  const [hintLevel, setHintLevel] = useState(0);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [hintDestSquare, setHintDestSquare] = useState<Square | null>(null);
  const [fenInput, setFenInput] = useState('');
  const [fenError, setFenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { chess, lastMove } = useMemo(() => {
    const c = new Chess(startFen);
    let lm: LastMove = null;
    for (const m of moves.slice(0, ply)) {
      c.move({ from: m.from, to: m.to, promotion: m.promotion });
      lm = { from: m.from, to: m.to };
    }
    return { chess: c, lastMove: lm };
  }, [startFen, moves, ply]);

  const fen = chess.fen();
  const { isReady, isAnalyzing, evalScore, arrows, bestMove, pv } = useEngineAnalysis(fen);
  const gameOverMsg = gameOverMessage(chess);
  const startChess = useMemo(() => new Chess(startFen), [startFen]);
  const bestLine = useMemo(() => pvToSan(fen, pv), [fen, pv]);

  const clearHint = () => {
    setHintSquare(null);
    setHintDestSquare(null);
    setHintLevel(0);
  };

  const goToPly = useCallback((p: number) => {
    setPly(Math.max(0, Math.min(moves.length, p)));
    clearHint();
  }, [moves.length]);

  // Playing a move from an earlier position starts a new branch.
  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    const c = new Chess(fen);
    let result;
    try { result = c.move({ from, to, promotion }); } catch { return false; }
    if (!result) return false;
    const next = moves[ply];
    if (next && next.from === from && next.to === to && next.promotion === promotion) {
      setPly(ply + 1); // same as the existing continuation: just step forward
    } else {
      setMoves([...moves.slice(0, ply), { san: result.san, from, to, promotion }]);
      setPly(ply + 1);
    }
    clearHint();
    return true;
  }, [fen, moves, ply]);

  const handleHint = async () => {
    const move = await bestMove();
    if (!move) return;
    setHintSquare(move.slice(0, 2) as Square);
    if (hintLevel === 0) {
      setHintDestSquare(null);
      setHintLevel(1);
    } else {
      setHintDestSquare(move.slice(2, 4) as Square);
      setHintLevel(2);
    }
  };

  const loadFen = (value: string) => {
    const v = value.trim();
    if (!v) return;
    try {
      const c = new Chess(v);
      setStartFen(c.fen());
      setMoves([]);
      setPly(0);
      setFenError(null);
      setFenInput('');
      setFlipped(c.turn() === 'b');
      clearHint();
    } catch {
      setFenError('That doesn’t look like a valid FEN.');
    }
  };

  const reset = () => {
    setStartFen(START_FEN);
    setMoves([]);
    setPly(0);
    setFenError(null);
    clearHint();
  };

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  useArrowKeys(active, {
    left: () => goToPly(ply - 1),
    right: () => goToPly(ply + 1),
    up: () => goToPly(0),
    down: () => goToPly(moves.length),
  });

  const { label: evalLabel, whiteAdvantage } = evalBar(evalScore);
  const evalText = gameOverMsg ? (chess.isCheckmate() ? '#' : '½–½') : evalLabel;
  const evalSub = gameOverMsg ?? (!isReady ? 'Starting engine…' : describeEval(evalScore));

  const boardCol = (
    <div className="flex gap-2 sm:gap-3 items-stretch">
      <EvalBar evalScore={evalScore} flipped={flipped} ready={isReady}/>
      <div className="flex-1 min-w-0">
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
      </div>
    </div>
  );

  const navBtn = (onClick: () => void, disabled: boolean, label: string, icon: React.ReactNode) => (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className="btn btn-secondary flex-1 px-0">
      {icon}
    </button>
  );

  const panel = (
    <>
      <section className="card p-4 flex items-center gap-4">
        <div className={`min-w-[5.5rem] h-14 px-3 rounded-xl flex items-center justify-center text-2xl font-bold tabular-nums ${
          whiteAdvantage >= 50 ? 'bg-[var(--eval-white)] text-[#1d1b18] border border-line' : 'bg-[var(--eval-black)] text-[#eee]'
        }`}>
          {evalText}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-fg flex items-center gap-2">
            {evalSub}
            {isAnalyzing && <span className="w-3.5 h-3.5 rounded-full border-2 border-line-strong border-t-accent animate-spin" aria-label="Analyzing"/>}
          </div>
          <div className="text-sm text-muted truncate mt-0.5" title={bestLine.join(' ')}>
            {bestLine.length > 0 ? <>Best: <span className="font-medium text-fg">{bestLine.join(' ')}</span></> : `${chess.turn() === 'w' ? 'White' : 'Black'} to move`}
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        {navBtn(() => goToPly(0), ply === 0, 'First move', <ChevronsLeftIcon size={18}/>)}
        {navBtn(() => goToPly(ply - 1), ply === 0, 'Previous move', <ChevronLeftIcon size={18}/>)}
        {navBtn(() => goToPly(ply + 1), ply >= moves.length, 'Next move', <ChevronRightIcon size={18}/>)}
        {navBtn(() => goToPly(moves.length), ply >= moves.length, 'Last move', <ChevronsRightIcon size={18}/>)}
        <button onClick={() => setFlipped(f => !f)} aria-label="Flip board" title="Flip board" className="btn btn-ghost btn-icon h-11 w-11">
          <FlipIcon size={18}/>
        </button>
      </div>

      <Panel title="Moves" action={<span className="hidden lg:inline text-xs text-subtle"><span className="kbd">←</span> <span className="kbd">→</span> to step</span>}>
        <MoveList
          sans={moves.map(m => m.san)}
          ply={ply}
          onSelect={goToPly}
          startMoveNumber={startChess.moveNumber()}
          blackFirst={startChess.turn() === 'b'}
          empty="Move pieces on the board to explore."
        />
      </Panel>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleHint} disabled={!!gameOverMsg || hintLevel >= 2} className="btn btn-soft h-12">
          <BulbIcon size={18}/> {hintLevel === 0 ? 'Best move' : hintLevel === 1 ? 'Show target' : 'Shown'}
        </button>
        {onPlayFromHere && (
          <button onClick={() => onPlayFromHere(fen, chess.turn())} disabled={!!gameOverMsg} className="btn btn-primary h-12">
            <PlayIcon size={18}/> Play from here
          </button>
        )}
      </div>

      <Panel title="Position">
        <div className="px-4 pb-4 flex flex-col gap-2">
          <form
            className="flex gap-2"
            onSubmit={e => { e.preventDefault(); loadFen(fenInput); }}
          >
            <input
              value={fenInput}
              onChange={e => { setFenInput(e.target.value); setFenError(null); }}
              placeholder="Paste a FEN to load a position"
              className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-surface-2 border border-line text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-accent"
              aria-label="FEN"
            />
            <button type="submit" disabled={!fenInput.trim()} className="btn btn-secondary h-10 min-h-0">Load</button>
          </form>
          {fenError && <div className="text-xs text-danger">{fenError}</div>}
          <div className="flex gap-2">
            <button onClick={copyFen} className="btn btn-ghost h-9 min-h-0 px-2 text-xs">
              <ClipboardIcon size={16}/> {copied ? 'Copied!' : 'Copy FEN'}
            </button>
            <button onClick={reset} className="btn btn-ghost h-9 min-h-0 px-2 text-xs">
              <ResetIcon size={16}/> Starting position
            </button>
          </div>
        </div>
      </Panel>
    </>
  );

  return <BoardLayout board={boardCol} panel={panel}/>;
}
