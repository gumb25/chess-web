'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { AppSettings } from '@/lib/types';
import { useEngineAnalysis, evalBar } from '@/hooks/useEngineAnalysis';
import { playMoveSound } from '@/lib/sound';

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

export default function OpeningMode({ settings }: Props) {
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
    playMoveSound(result);
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
    playMoveSound(result);
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
  const topMoves: MoveEntry[] = db?.moves[epd]?.slice(0, 3) ?? [];
  const loading = db === null && !dbError;

  const { whiteAdvantage, label: evalLabel } = evalBar(evalScore);

  return (
    <div className="flex flex-col items-center gap-2 py-2 px-3">

      {/* Opening name card — fixed height; text shrinks for long names */}
      <div className="w-full max-w-[480px] bg-white border border-gray-200 rounded-2xl px-4 py-3">
        <div className="h-8 flex items-center">
          {loading ? (
            <div className="text-sm text-gray-400">Loading opening database…</div>
          ) : dbError ? (
            <div className="text-sm text-red-500">Couldn&apos;t load the opening database.</div>
          ) : opening ? (
            <button
              onClick={() => setShowNameModal(true)}
              className="flex items-center gap-2 min-w-0 w-full text-left"
              title="Tap for full name"
            >
              <span className="text-[11px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                {opening.eco}
              </span>
              <span
                className={`font-semibold text-gray-800 truncate ${
                  opening.name.length > 44 ? 'text-xs'
                    : opening.name.length > 30 ? 'text-sm'
                    : 'text-base'
                }`}
              >
                {opening.name}
              </span>
            </button>
          ) : (
            <div className="text-sm text-gray-400">
              {currentPly === 0 ? 'Make a move to explore openings' : 'Out of opening theory'}
            </div>
          )}
        </div>

        {transposition && (
          <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
            ↔ Transposition — {transposition}
          </div>
        )}
      </div>

      {/* Evaluation bar */}
      <div className="w-full max-w-[480px] flex items-center gap-2">
        <span className="text-xs text-gray-500 w-10 text-right">
          {isReady ? evalLabel : '…'}
        </span>
        <div className="flex-1 h-4 rounded-full overflow-hidden flex border border-gray-200">
          <div style={{ width: `${whiteAdvantage}%`, background: '#ffffff', flexShrink: 0, transition: 'width 300ms' }}/>
          <div style={{ flex: 1, background: '#000000' }}/>
        </div>
        {isAnalyzing && <span className="text-xs text-gray-300">⚙</span>}
      </div>

      {/* Board */}
      <ChessBoard
        chess={chess}
        flipped={flipped}
        theme={settings.boardTheme}
        onMove={handleMove}
        lastMove={lastMove}
        arrows={arrows}
      />

      {/* Move breadcrumb — click any move to jump to that position */}
      {moveHistory.length > 0 && (
        <div className="w-full max-w-[480px] flex flex-wrap items-center gap-x-1 gap-y-1 px-1 text-xs">
          {moveHistory.map((san, i) => (
            <React.Fragment key={i}>
              {i % 2 === 0 && (
                <span className="text-gray-300 ml-1 first:ml-0">{Math.floor(i / 2) + 1}.</span>
              )}
              <button
                onClick={() => setCurrentPly(i + 1)}
                className={`px-1 py-0.5 rounded font-medium transition-colors ${
                  currentPly === i + 1
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {san}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Popular continuations */}
      <div className="w-full max-w-[480px] bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Popular Continuations
          </span>
        </div>

        {topMoves.length === 0 ? (
          <div className="px-4 py-4 text-sm text-gray-400">
            {loading ? 'Loading…' : dbError ? 'Unavailable' : 'End of opening theory'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {topMoves.map(move => (
              <button
                key={move.uci}
                onClick={() => handleContinuation(move)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <span className="text-base font-bold text-gray-800 w-10 shrink-0">{move.san}</span>
                <span className="text-sm text-gray-400 truncate">
                  {move.continuationName ?? '—'}
                </span>
                <span className="ml-auto text-gray-200 text-lg shrink-0">›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 w-full max-w-[480px]">
        <button
          onClick={handleBack}
          disabled={currentPly === 0}
          className="flex-1 bg-white border border-gray-200 text-gray-600 rounded-xl py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleForward}
          disabled={currentPly >= moveHistory.length}
          className="flex-1 bg-white border border-gray-200 text-gray-600 rounded-xl py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          Forward →
        </button>
        <button
          onClick={() => setFlipped(f => !f)}
          className="bg-white border border-gray-200 text-gray-400 rounded-xl py-2 px-4 text-sm hover:bg-gray-50 transition-colors"
        >
          Flip
        </button>
        <button
          onClick={handleReset}
          disabled={moveHistory.length === 0}
          className="flex-1 bg-white border border-gray-200 text-gray-600 rounded-xl py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Full opening name popup */}
      {showNameModal && opening && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setShowNameModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                {opening.eco}
              </span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Opening</span>
            </div>
            <div className="text-lg font-bold text-gray-900 leading-snug">
              {opening.name}
            </div>
            <button
              onClick={() => setShowNameModal(false)}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-2 text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
