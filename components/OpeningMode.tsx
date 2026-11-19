'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { AppSettings } from '@/lib/types';
import { useEngineAnalysis, evalBar } from '@/hooks/useEngineAnalysis';
import { BoardLayout, Panel, EvalBar, MoveList, useArrowKeys } from './ui';
import { FlipIcon, ResetIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, PlayIcon, BookIcon } from './Icons';

interface OpeningInfo {
  eco: string;
  name: string;
}

interface MoveEntry {
  uci: string;
  san: string;
  continuationName: string | null;
}

interface OpeningDB {
  positions: Record<string, OpeningInfo>;
  moves: Record<string, MoveEntry[]>;
}

interface Props {
  settings: AppSettings;
  active?: boolean;
  onPlayFromHere?: (fen: string, color: 'w' | 'b') => void;
}

function normalEpd(fen: string) {
  return fen.split(' ').slice(0, 4).join(' ');
}

// Replay a list of SAN moves and return the resulting position + last move.
function positionAt(sans: string[], ply: number): { chess: Chess; lastMove: { from: Square; to: Square } | null } {
  const chess = new Chess();
  let lastMove: { from: Square; to: Square } | null = null;
  for (let i = 0; i < ply && i < sans.length; i++) {
    const r = chess.move(sans[i]);
    if (!r) break;
    lastMove = { from: r.from as Square, to: r.to as Square };
  }
  return { chess, lastMove };
}

export default function OpeningMode({ settings, active = true, onPlayFromHere }: Props) {
  const [db, setDb] = useState<OpeningDB | null>(null);
  const [dbError, setDbError] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentPly, setCurrentPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);

  // EPD → first move sequence that reached it (for transposition detection).
  // Recorded when a move is played, so navigating back and forth along the
  // current line never changes it.
  const [firstPaths, setFirstPaths] = useState<Map<string, string>>(
    () => new Map([[normalEpd(new Chess().fen()), '']])
  );

  useEffect(() => {
    fetch('/openings.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setDb)
      .catch(() => setDbError(true));
  }, []);

  // Derive the board position from the move list + current ply pointer.
  const { chess, lastMove } = useMemo(
    () => positionAt(moveHistory, currentPly),
    [moveHistory, currentPly]
  );

  const epd = normalEpd(chess.fen());
  const fen = chess.fen();

  // Stockfish evaluation of the displayed position, from White's perspective.
  const { isReady, isAnalyzing, evalScore, arrows } = useEngineAnalysis(fen);

  const seq = moveHistory.slice(0, currentPly).join(' ');
  const firstPath = firstPaths.get(epd);
  const transposition = firstPath !== undefined && firstPath !== seq
    ? `Also reachable via: ${firstPath || 'starting position'}`
    : null;

  // Play a move from the current position. If we're not at the end of the
  // line, this starts a new branch (truncates the future moves).
  const playSan = useCallback((san: string, resultFen: string) => {
    const path = [...moveHistory.slice(0, currentPly), san];
    const key = normalEpd(resultFen);
    setFirstPaths(prev => prev.has(key) ? prev : new Map(prev).set(key, path.join(' ')));
    setMoveHistory(path);
    setCurrentPly(currentPly + 1);
  }, [moveHistory, currentPly]);

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    const c = new Chess(chess.fen());
    const result = c.move({ from, to, promotion });
    if (!result) return false;
    playSan(result.san, c.fen());
    return true;
  }, [chess, playSan]);

  const handleContinuation = (move: MoveEntry) => {
    const c = new Chess(chess.fen());
    const result = c.move({
      from: move.uci.slice(0, 2) as Square,
      to: move.uci.slice(2, 4) as Square,
      promotion: move.uci[4] as string | undefined,
    });
    if (!result) return;
    playSan(result.san, c.fen());
  };

  const handleBack = () => setCurrentPly(p => Math.max(0, p - 1));
  const handleForward = () => setCurrentPly(p => Math.min(moveHistory.length, p + 1));

  const handleReset = () => {
    setMoveHistory([]);
    setCurrentPly(0);
    setFirstPaths(new Map([[normalEpd(new Chess().fen()), '']]));
  };

  const opening: OpeningInfo | null = db?.positions[epd] ?? null;
  const topMoves: MoveEntry[] = db?.moves[epd]?.slice(0, 5) ?? [];
  const loading = db === null && !dbError;

  const { label: evalLabel } = evalBar(evalScore);

  useArrowKeys(active, {
    left: handleBack,
    right: handleForward,
    up: () => setCurrentPly(0),
    down: () => setCurrentPly(moveHistory.length),
  });

  const boardCol = (
    <div className="flex gap-2 sm:gap-3 items-stretch">
      <EvalBar evalScore={evalScore} flipped={flipped} ready={isReady}/>
      <div className="flex-1 min-w-0">
        <ChessBoard
          chess={chess}
          flipped={flipped}
          theme={settings.boardTheme}
          onMove={handleMove}
          lastMove={lastMove}
          arrows={arrows}
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
      {/* Opening name */}
      <section className="card p-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-info-soft text-info flex items-center justify-center shrink-0"><BookIcon/></span>
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="text-sm text-muted pt-2.5">Loading opening database…</div>
            ) : dbError ? (
              <div className="text-sm text-danger pt-2.5">Couldn&apos;t load the opening database.</div>
            ) : opening ? (
              <button onClick={() => setShowNameModal(true)} className="text-left w-full" title="Tap for full name">
                <span className="text-[11px] font-mono font-semibold bg-surface-2 text-muted px-1.5 py-0.5 rounded">{opening.eco}</span>
                <span className="block font-bold text-fg leading-snug mt-1 line-clamp-2">{opening.name}</span>
              </button>
            ) : (
              <div className="pt-0.5">
                <div className="font-bold text-fg">{currentPly === 0 ? 'Starting position' : 'Out of book'}</div>
                <div className="text-sm text-muted">{currentPly === 0 ? 'Make a move or pick one below.' : 'This position isn’t in the opening database.'}</div>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold tabular-nums text-fg">{isReady ? evalLabel : '…'}</div>
            <div className="text-[11px] text-subtle">{isAnalyzing ? 'thinking' : 'eval'}</div>
          </div>
        </div>
        {transposition && (
          <div className="mt-3 text-xs text-accent-soft-fg bg-accent-soft rounded-lg px-2.5 py-1.5">
            ↔ Transposition. {transposition}
          </div>
        )}
      </section>

      {/* Popular continuations */}
      <Panel title="Popular replies">
        {topMoves.length === 0 ? (
          <div className="px-4 pb-4 text-sm text-subtle">
            {loading ? 'Loading…' : dbError ? 'Unavailable' : 'No more book moves from here.'}
          </div>
        ) : (
          <div className="px-2 pb-2 flex flex-col">
            {topMoves.map((move, i) => (
              <button
                key={move.uci}
                onClick={() => handleContinuation(move)}
                className="w-full px-2 py-2.5 rounded-lg flex items-center gap-3 hover:bg-surface-2 active:bg-surface-3 transition-colors text-left group"
              >
                <span className={`min-w-12 h-8 px-2 rounded-lg flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg'}`}>
                  {move.san}
                </span>
                <span className="text-sm text-muted truncate flex-1">{move.continuationName ?? 'Main line'}</span>
                <span className="text-subtle group-hover:text-fg transition-colors"><ChevronRightIcon size={16}/></span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <div className="flex gap-2">
        {navBtn(() => setCurrentPly(0), currentPly === 0, 'Start', <ChevronsLeftIcon size={18}/>)}
        {navBtn(handleBack, currentPly === 0, 'Back', <ChevronLeftIcon size={18}/>)}
        {navBtn(handleForward, currentPly >= moveHistory.length, 'Forward', <ChevronRightIcon size={18}/>)}
        {navBtn(() => setCurrentPly(moveHistory.length), currentPly >= moveHistory.length, 'End', <ChevronsRightIcon size={18}/>)}
        <button onClick={() => setFlipped(f => !f)} aria-label="Flip board" title="Flip board" className="btn btn-ghost btn-icon h-11 w-11">
          <FlipIcon size={18}/>
        </button>
      </div>

      <Panel
        title="Your line"
        action={moveHistory.length > 0 && (
          <button onClick={handleReset} className="btn btn-ghost h-8 min-h-0 px-2 -mr-2 text-xs"><ResetIcon size={14}/> Reset</button>
        )}
      >
        <MoveList sans={moveHistory} ply={currentPly} onSelect={setCurrentPly} empty="Your moves will appear here."/>
      </Panel>

      {onPlayFromHere && currentPly > 0 && (
        <button onClick={() => onPlayFromHere(fen, chess.turn())} className="btn btn-secondary h-11">
          <PlayIcon size={16}/> Play this position vs computer
        </button>
      )}

      {/* Full opening name popup */}
      {showNameModal && opening && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
          onClick={() => setShowNameModal(false)}
        >
          <div className="card animate-pop p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-mono font-semibold bg-surface-2 text-muted px-1.5 py-0.5 rounded">{opening.eco}</span>
              <span className="eyebrow">Opening</span>
            </div>
            <div className="text-lg font-bold text-fg leading-snug">{opening.name}</div>
            <button onClick={() => setShowNameModal(false)} className="btn btn-primary w-full mt-5">Close</button>
          </div>
        </div>
      )}
    </>
  );

  return <BoardLayout board={boardCol} panel={panel}/>;
}
