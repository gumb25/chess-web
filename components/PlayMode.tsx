'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import ChessPiece from './ChessPiece';
import { AppSettings, skillLabel } from '@/lib/types';
import { useStockfish } from '@/hooks/useStockfish';
import { BoardLayout, Panel, PlayerBar, MoveList, Status } from './ui';
import { BulbIcon, UndoIcon, FlagIcon, FlipIcon, ShuffleIcon, MicroscopeIcon, PlayIcon, CheckIcon, XIcon } from './Icons';

interface Props {
  settings: AppSettings;
  initialFen?: string;
  initialColor?: 'w' | 'b';
  onSettingsChange: (s: AppSettings) => void;
  onAnalyze?: (fen: string, moves: string[], playerColor: 'w' | 'b') => void;
}

type GameState = 'setup' | 'playing' | 'over';
type ColorChoice = 'w' | 'b' | 'random';
type LastMove = { from: Square; to: Square } | null;
type PlayedMove = { san: string; uci: string };

const PRESETS = [
  { value: 1, label: 'Beginner' },
  { value: 5, label: 'Casual' },
  { value: 10, label: 'Club' },
  { value: 15, label: 'Advanced' },
  { value: 20, label: 'Master' },
];

function EngineAvatar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="7" width="14" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9.5 15.5h5"/>
    </svg>
  );
}
function YouAvatar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5"/>
    </svg>
  );
}

export default function PlayMode({ settings, initialFen, initialColor, onSettingsChange, onAnalyze }: Props) {
  const [gameState, setGameState] = useState<GameState>(initialFen ? 'playing' : 'setup');
  const [colorChoice, setColorChoice] = useState<ColorChoice>(initialColor ?? 'w');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>(initialColor ?? 'w');
  const [startFen, setStartFen] = useState<string>(() => new Chess(initialFen).fen());
  const [chess, setChess] = useState<Chess>(() => new Chess(initialFen));
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  // Positions before each of the player's moves, so Undo takes back the
  // player's last move together with the engine's reply.
  const [history, setHistory] = useState<{ chess: Chess; lastMove: LastMove; movesLen: number }[]>([]);
  const [lastMove, setLastMove] = useState<LastMove>(null);
  const [statusMsg, setStatusMsg] = useState<{ title: string; outcome: 'win' | 'loss' | 'draw' } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [skill, setSkill] = useState(settings.engineSkill);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [hintDestSquare, setHintDestSquare] = useState<Square | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [flipped, setFlipped] = useState(initialColor === 'b');
  const engineColorRef = useRef<'w' | 'b'>('b');
  // Bumped whenever the game is reset/abandoned so a late engine reply for an
  // old position is discarded instead of being played on the new board.
  const gameIdRef = useRef(0);

  const { getBestMove, sendCommand } = useStockfish();
  const previewBoard = useMemo(() => new Chess(), []);

  const applySkill = useCallback((level: number) => {
    sendCommand(`setoption name Skill Level value ${level}`);
  }, [sendCommand]);

  const checkGameOver = (c: Chess): { title: string; outcome: 'win' | 'loss' | 'draw' } | null => {
    if (c.isCheckmate()) return c.turn() === playerColor
      ? { title: 'Stockfish wins by checkmate', outcome: 'loss' }
      : { title: 'You win by checkmate!', outcome: 'win' };
    if (c.isStalemate()) return { title: 'Draw by stalemate', outcome: 'draw' };
    if (c.isThreefoldRepetition()) return { title: 'Draw by repetition', outcome: 'draw' };
    if (c.isInsufficientMaterial()) return { title: 'Draw: insufficient material', outcome: 'draw' };
    if (c.isDraw()) return { title: 'Draw', outcome: 'draw' };
    return null;
  };

  const engineMove = useCallback(async (c: Chess) => {
    const gameId = gameIdRef.current;
    setThinking(true);
    applySkill(skill);
    try {
      const result = await getBestMove(c.fen(), 1000);
      if (gameId !== gameIdRef.current) return;
      if (!result.bestMove || result.bestMove === '(none)') return;
      const from = result.bestMove.slice(0, 2) as Square;
      const to = result.bestMove.slice(2, 4) as Square;
      const promo = result.bestMove[4] as string | undefined;
      const c2 = new Chess(c.fen());
      const mv = c2.move({ from, to, promotion: promo });
      setChess(c2);
      setLastMove({ from, to });
      setMoves(m => [...m, { san: mv.san, uci: result.bestMove }]);
      const over = checkGameOver(c2);
      if (over) { setStatusMsg(over); setGameState('over'); }
    } finally {
      if (gameId === gameIdRef.current) setThinking(false);
    }
  }, [getBestMove, skill, applySkill, playerColor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameState === 'playing' && initialFen && initialColor) {
      engineColorRef.current = initialColor === 'w' ? 'b' : 'w';
      if (chess.turn() === engineColorRef.current) {
        engineMove(chess);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetHint = () => {
    setHintSquare(null);
    setHintDestSquare(null);
    setHintLevel(0);
  };

  const startGame = () => {
    const color: 'w' | 'b' = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice;
    const c = new Chess();
    gameIdRef.current++;
    engineColorRef.current = color === 'w' ? 'b' : 'w';
    setPlayerColor(color);
    setFlipped(color === 'b');
    setStartFen(c.fen());
    setChess(c);
    setMoves([]);
    setHistory([]);
    setLastMove(null);
    setStatusMsg(null);
    setThinking(false);
    setConfirmResign(false);
    resetHint();
    setGameState('playing');
    // engineMove reads playerColor from its closure, which is still the old
    // value here; the engine only needs the position, so that's fine.
    if (color === 'b') engineMove(c);
  };

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    if (chess.turn() !== playerColor || thinking) return false;
    const c = new Chess(chess.fen());
    let result;
    try { result = c.move({ from, to, promotion }); } catch { return false; }
    if (!result) return false;

    setHistory(h => [...h, { chess, lastMove, movesLen: moves.length }]);
    setChess(c);
    setLastMove({ from, to });
    setMoves(m => [...m, { san: result.san, uci: `${from}${to}${promotion ?? ''}` }]);
    setConfirmResign(false);
    resetHint();

    const over = checkGameOver(c);
    if (over) { setStatusMsg(over); setGameState('over'); return true; }

    engineMove(c);
    return true;
  }, [chess, lastMove, playerColor, thinking, engineMove, moves.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = () => {
    if (history.length === 0 || thinking) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setChess(prev.chess);
    setLastMove(prev.lastMove);
    setMoves(m => m.slice(0, prev.movesLen));
    resetHint();
  };

  const handleHint = useCallback(async () => {
    const result = await getBestMove(chess.fen(), 600);
    if (!result.bestMove || result.bestMove === '(none)') return;
    const from = result.bestMove.slice(0, 2) as Square;
    const to = result.bestMove.slice(2, 4) as Square;
    if (hintLevel === 0) { setHintSquare(from); setHintDestSquare(null); setHintLevel(1); }
    else { setHintSquare(from); setHintDestSquare(to); setHintLevel(2); }
  }, [chess, getBestMove, hintLevel]);

  const handleResign = () => {
    if (!confirmResign) { setConfirmResign(true); return; }
    gameIdRef.current++;
    setThinking(false);
    setConfirmResign(false);
    setStatusMsg({ title: 'You resigned', outcome: 'loss' });
    setGameState('over');
  };

  const changeSkill = (v: number, live = false) => {
    setSkill(v);
    if (live) applySkill(v);
    onSettingsChange({ ...settings, engineSkill: v });
  };

  const strengthControl = (live: boolean) => (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-surface-2">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => changeSkill(p.value, live)}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${skillLabelBucket(skill) === p.value ? 'bg-surface text-fg shadow-[var(--shadow-sm)]' : 'text-muted hover:text-fg'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range" min={0} max={20} value={skill}
          onChange={e => changeSkill(+e.target.value, live)}
          className="range flex-1"
          aria-label="Engine skill level"
        />
        <span className="text-sm font-semibold text-fg tabular-nums w-14 text-right">Lvl {skill}</span>
      </div>
    </div>
  );

  // ── Setup ────────────────────────────────────────────────────────────────
  if (gameState === 'setup') {
    const colorOpt = (value: ColorChoice, label: string, piece: React.ReactNode) => (
      <button
        onClick={() => setColorChoice(value)}
        aria-pressed={colorChoice === value}
        className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
          colorChoice === value ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong bg-surface'
        }`}
      >
        <span className="h-11 flex items-center justify-center text-fg">{piece}</span>
        <span className="text-sm font-semibold text-fg">{label}</span>
      </button>
    );
    const panel = (
      <div className="card p-5 sm:p-6 flex flex-col gap-6 animate-fade-up">
        <div>
          <h2 className="text-xl font-bold text-fg tracking-tight">New game vs Stockfish</h2>
          <p className="text-sm text-muted mt-1">Pick your side and how strong the computer should be.</p>
        </div>
        <div>
          <div className="eyebrow mb-2">Play as</div>
          <div className="flex gap-2">
            {colorOpt('w', 'White', <ChessPiece color="w" type="k" size={46}/>)}
            {colorOpt('random', 'Random', <ShuffleIcon size={26}/>)}
            {colorOpt('b', 'Black', <ChessPiece color="b" type="k" size={46}/>)}
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="eyebrow">Computer strength</div>
            <div className="text-sm font-semibold text-accent">{skillLabel(skill)}</div>
          </div>
          {strengthControl(false)}
        </div>
        <button onClick={startGame} className="btn btn-primary h-12 text-base">
          <PlayIcon size={18}/> Start game
        </button>
      </div>
    );
    const board = (
      <div className="hidden lg:block opacity-90 pointer-events-none" aria-hidden="true">
        <ChessBoard chess={previewBoard} theme={settings.boardTheme} disabled flipped={colorChoice === 'b'}/>
      </div>
    );
    return <BoardLayout board={board} panel={panel} panelFirst/>;
  }

  // ── Game ─────────────────────────────────────────────────────────────────
  const isPlayerTurn = chess.turn() === playerColor;
  const engineColor: 'w' | 'b' = playerColor === 'w' ? 'b' : 'w';
  const startChess = new Chess(startFen);
  const topColor = flipped ? 'w' : 'b';
  const bar = (color: 'w' | 'b') => color === playerColor
    ? <PlayerBar key="you" name="You" color={color} chess={chess} active={gameState === 'playing' && isPlayerTurn} avatar={<YouAvatar/>}/>
    : <PlayerBar key="sf" name="Stockfish" detail={`${skillLabel(skill)} · Lvl ${skill}`} color={color} chess={chess} active={gameState === 'playing' && !isPlayerTurn} avatar={<EngineAvatar/>}/>;

  const boardCol = (
    <>
      {bar(topColor)}
      <ChessBoard
        chess={chess}
        flipped={flipped}
        theme={settings.boardTheme}
        onMove={handleMove}
        disabled={!isPlayerTurn || gameState === 'over' || thinking}
        hintSquare={hintSquare}
        hintDestSquare={hintDestSquare}
        lastMove={lastMove}
      />
      {bar(topColor === 'w' ? 'b' : 'w')}
    </>
  );

  let status: React.ReactNode;
  if (gameState === 'over' && statusMsg) {
    const tone = statusMsg.outcome === 'win' ? 'success' : statusMsg.outcome === 'loss' ? 'danger' : 'info';
    const icon = statusMsg.outcome === 'win' ? <CheckIcon/> : statusMsg.outcome === 'loss' ? <XIcon/> : <span className="font-bold">½</span>;
    status = <Status tone={tone} icon={icon} title={statusMsg.title}>{moves.length} moves played</Status>;
  } else if (thinking || !isPlayerTurn) {
    status = (
      <Status tone="neutral" icon={<span className="w-5 h-5 rounded-full border-2 border-line-strong border-t-accent animate-spin"/>} title="Stockfish is thinking…">
        Playing {engineColor === 'w' ? 'White' : 'Black'}
      </Status>
    );
  } else {
    status = (
      <Status tone="accent" icon={<span className={`w-5 h-5 rounded-full border-2 ${playerColor === 'w' ? 'bg-white border-[#999]' : 'bg-[#222] border-[#222]'}`}/>} title={chess.isCheck() ? 'Check! Your move' : 'Your move'}>
        {hintLevel === 1 ? 'Hint: move the highlighted piece.' : hintLevel === 2 ? 'Hint: the green square is the target.' : `You’re playing ${playerColor === 'w' ? 'White' : 'Black'}.`}
      </Status>
    );
  }

  const panel = (
    <>
      {status}

      {gameState === 'playing' && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleHint} disabled={!isPlayerTurn || thinking || hintLevel >= 2} className="btn btn-soft h-12 flex-col gap-0.5 text-xs">
            <BulbIcon size={18}/> Hint
          </button>
          <button onClick={handleUndo} disabled={history.length === 0 || thinking} className="btn btn-secondary h-12 flex-col gap-0.5 text-xs">
            <UndoIcon size={18}/> Undo
          </button>
          <button
            onClick={handleResign}
            onBlur={() => setConfirmResign(false)}
            className={`btn h-12 flex-col gap-0.5 text-xs ${confirmResign ? 'bg-danger text-white' : 'btn-danger'}`}
          >
            <FlagIcon size={18}/> {confirmResign ? 'Confirm' : 'Resign'}
          </button>
        </div>
      )}

      {gameState === 'over' && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setGameState('setup')} className="btn btn-primary h-12">
            <PlayIcon size={18}/> New game
          </button>
          <button
            onClick={() => onAnalyze?.(startFen, moves.map(m => m.uci), playerColor)}
            disabled={moves.length === 0}
            className="btn btn-secondary h-12"
          >
            <MicroscopeIcon size={18}/> Review
          </button>
        </div>
      )}

      <Panel
        title="Moves"
        action={
          <button onClick={() => setFlipped(f => !f)} className="btn btn-ghost btn-icon -mr-2 -my-1" aria-label="Flip board" title="Flip board">
            <FlipIcon size={18}/>
          </button>
        }
      >
        <MoveList
          sans={moves.map(m => m.san)}
          ply={moves.length}
          startMoveNumber={startChess.moveNumber()}
          blackFirst={startChess.turn() === 'b'}
          empty={isPlayerTurn ? 'Make your first move.' : 'Waiting for Stockfish…'}
        />
      </Panel>

      {gameState === 'playing' && (
        <Panel title="Computer strength">
          <div className="px-4 pb-4">{strengthControl(true)}</div>
        </Panel>
      )}
    </>
  );

  return <BoardLayout board={boardCol} panel={panel}/>;
}

// Which preset a skill level belongs to (for highlighting the preset chip).
function skillLabelBucket(skill: number): number {
  return skill <= 3 ? 1 : skill <= 7 ? 5 : skill <= 12 ? 10 : skill <= 17 ? 15 : 20;
}
