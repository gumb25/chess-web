'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import ChessBoard from './ChessBoard';
import { AppSettings } from '@/lib/types';
import { useStockfish } from '@/hooks/useStockfish';

interface Props {
  settings: AppSettings;
  initialFen?: string;
  initialColor?: 'w' | 'b';
  onSettingsChange: (s: AppSettings) => void;
}

type GameState = 'setup' | 'playing' | 'over';

export default function PlayMode({ settings, initialFen, initialColor, onSettingsChange }: Props) {
  const [gameState, setGameState] = useState<GameState>(initialFen ? 'playing' : 'setup');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>(initialColor ?? 'w');
  const [chess, setChess] = useState<Chess>(() => initialFen ? new Chess(initialFen) : new Chess());
  const [history, setHistory] = useState<Chess[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [thinking, setThinking] = useState(false);
  const [skill, setSkill] = useState(settings.engineSkill);
  const [showSettings, setShowSettings] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);
  const [hintDestSquare, setHintDestSquare] = useState<Square | null>(null);
  const engineColorRef = useRef<'w' | 'b'>('b');

  const { getBestMove, sendCommand } = useStockfish();

  const applySkill = useCallback((level: number) => {
    sendCommand(`setoption name Skill Level value ${level}`);
  }, [sendCommand]);

  const checkGameOver = (c: Chess): string | null => {
    if (c.isCheckmate()) return c.turn() === playerColor ? 'Engine wins by checkmate!' : 'You win by checkmate!';
    if (c.isStalemate()) return 'Stalemate — draw.';
    if (c.isDraw()) return 'Draw.';
    return null;
  };

  const engineMove = useCallback(async (c: Chess) => {
    setThinking(true);
    applySkill(skill);
    try {
      const result = await getBestMove(c.fen(), 1000);
      if (!result.bestMove || result.bestMove === '(none)') return;
      const from = result.bestMove.slice(0, 2) as Square;
      const to = result.bestMove.slice(2, 4) as Square;
      const promo = result.bestMove[4] as string | undefined;
      const c2 = new Chess(c.fen());
      c2.move({ from, to, promotion: promo });
      setChess(c2);
      setLastMove({ from, to });
      const over = checkGameOver(c2);
      if (over) { setStatusMsg(over); setGameState('over'); }
    } finally {
      setThinking(false);
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

  const startGame = () => {
    const c = new Chess();
    engineColorRef.current = playerColor === 'w' ? 'b' : 'w';
    setChess(c);
    setHistory([]);
    setLastMove(null);
    setStatusMsg('');
    setGameState('playing');
    if (playerColor === 'b') engineMove(c);
  };

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    if (chess.turn() !== playerColor || thinking) return false;
    const c = new Chess(chess.fen());
    const result = c.move({ from, to, promotion });
    if (!result) return false;

    setHistory(h => [...h, chess]);
    setChess(c);
    setLastMove({ from, to });
    setHintSquare(null);
    setHintDestSquare(null);
    setHintLevel(0);

    const over = checkGameOver(c);
    if (over) { setStatusMsg(over); setGameState('over'); return true; }

    engineMove(c);
    return true;
  }, [chess, playerColor, thinking, engineMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = () => {
    if (history.length < 2) return;
    const prev = history[history.length - 2];
    setHistory(h => h.slice(0, -2));
    setChess(prev);
    setLastMove(null);
    setHintSquare(null);
    setHintDestSquare(null);
    setHintLevel(0);
  };

  const handleHint = useCallback(async () => {
    const result = await getBestMove(chess.fen(), 600);
    if (!result.bestMove) return;
    const from = result.bestMove.slice(0, 2) as Square;
    const to = result.bestMove.slice(2, 4) as Square;
    if (hintLevel === 0) { setHintSquare(from); setHintDestSquare(null); setHintLevel(1); }
    else { setHintSquare(from); setHintDestSquare(to); setHintLevel(2); }
  }, [chess, getBestMove, hintLevel]);

  const handleResign = () => {
    setStatusMsg('You resigned. Engine wins.');
    setGameState('over');
  };

  if (gameState === 'setup') {
    const skillLabel = skill <= 3 ? 'Beginner' : skill <= 6 ? 'Intermediate' : skill <= 10 ? 'Club Player' : skill <= 14 ? 'Advanced' : skill <= 18 ? 'Expert' : 'Maximum';
    return (
      <div className="flex flex-col items-center gap-6 py-12 px-4">
        <h2 className="text-2xl font-bold text-gray-800">Play vs Stockfish</h2>
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">Your Color</label>
            <div className="flex gap-3">
              {(['w', 'b'] as const).map(c => (
                <button key={c} onClick={() => setPlayerColor(c)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${playerColor === c ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {c === 'w' ? 'White' : 'Black'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">Skill Level: {skillLabel} ({skill})</label>
            <input type="range" min={0} max={20} value={skill} onChange={e => setSkill(+e.target.value)}
              className="w-full accent-gray-800"/>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Beginner</span><span>Maximum</span>
            </div>
          </div>
          <button onClick={startGame} className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
            Start Game
          </button>
        </div>
      </div>
    );
  }

  const isPlayerTurn = chess.turn() === playerColor;
  const turnLabel = isPlayerTurn ? 'Your turn' : 'Engine thinking…';

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex items-center justify-between w-full max-w-[480px] px-1">
        <div>
          <div className="text-sm font-semibold text-gray-700">{gameState === 'over' ? statusMsg : turnLabel}</div>
          {thinking && <div className="text-xs text-blue-500">Stockfish is thinking…</div>}
        </div>
        <button onClick={() => setShowSettings(s => !s)} className="text-gray-400 hover:text-gray-600 text-lg" title="Engine settings">⚙</button>
      </div>

      {showSettings && (
        <div className="w-full max-w-[480px] bg-white border border-gray-200 rounded-2xl p-4">
          <label className="text-sm font-medium text-gray-600 mb-2 block">
            Skill Level: {skill <= 3 ? 'Beginner' : skill <= 6 ? 'Intermediate' : skill <= 10 ? 'Club Player' : skill <= 14 ? 'Advanced' : skill <= 18 ? 'Expert' : 'Maximum'} ({skill})
          </label>
          <input type="range" min={0} max={20} value={skill}
            onChange={e => { const v = +e.target.value; setSkill(v); applySkill(v); onSettingsChange({ ...settings, engineSkill: v }); }}
            className="w-full accent-gray-800"/>
        </div>
      )}

      <ChessBoard
        chess={chess}
        flipped={playerColor === 'b'}
        theme={settings.boardTheme}
        onMove={handleMove}
        disabled={!isPlayerTurn || gameState === 'over' || thinking}
        hintSquare={hintSquare}
        hintDestSquare={hintDestSquare}
        lastMove={lastMove}
      />

      <div className="flex gap-2 max-w-[480px] w-full">
        {gameState === 'playing' && (
          <>
            <button onClick={handleHint} disabled={!isPlayerTurn} className="flex-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40">
              Hint {hintLevel > 0 ? `(${hintLevel}/2)` : ''}
            </button>
            <button onClick={handleUndo} disabled={history.length < 2} className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40">
              Undo
            </button>
            <button onClick={handleResign} className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl py-2 text-sm font-medium transition-colors">
              Resign
            </button>
          </>
        )}
        {gameState === 'over' && (
          <button onClick={() => setGameState('setup')} className="flex-1 bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-2 text-sm font-semibold transition-colors">
            New Game
          </button>
        )}
      </div>
    </div>
  );
}
