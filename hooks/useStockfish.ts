'use client';

import { useEffect, useRef, useCallback } from 'react';

interface StockfishHook {
  sendCommand: (cmd: string) => void;
  getBestMove: (fen: string, movetime: number) => Promise<{ bestMove: string; score: string; pv: string[] }>;
  isReady: boolean;
}

export function useStockfish(onReady?: () => void): StockfishHook {
  const workerRef = useRef<Worker | null>(null);
  const isReadyRef = useRef(false);
  const resolversRef = useRef<Map<string, (v: { bestMove: string; score: string; pv: string[] }) => void>>(new Map());
  const currentFenRef = useRef('');
  const currentScoreRef = useRef('');
  const currentPvRef = useRef<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker('/stockfish.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const line: string = typeof e.data === 'string' ? e.data : '';
      if (!line) return;

      if (line === 'uciok') {
        worker.postMessage('setoption name Hash value 32');
        worker.postMessage('isready');
      }

      if (line === 'readyok') {
        isReadyRef.current = true;
        onReady?.();
      }

      if (line.startsWith('info')) {
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        if (scoreMatch) {
          const type = scoreMatch[1];
          const val = parseInt(scoreMatch[2]);
          currentScoreRef.current = type === 'mate'
            ? (val > 0 ? `M${val}` : `-M${Math.abs(val)}`)
            : `${val}`;
        }
        const pvMatch = line.match(/ pv (.+)/);
        if (pvMatch) {
          currentPvRef.current = pvMatch[1].trim().split(' ');
        }
      }

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestMove = parts[1] ?? '';
        const resolver = resolversRef.current.get(currentFenRef.current);
        if (resolver) {
          resolver({
            bestMove,
            score: currentScoreRef.current,
            pv: currentPvRef.current,
          });
          resolversRef.current.delete(currentFenRef.current);
        }
        currentScoreRef.current = '';
        currentPvRef.current = [];
      }
    };

    worker.onerror = (e) => console.error('Stockfish error:', e);
    worker.postMessage('uci');

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendCommand = useCallback((cmd: string) => {
    workerRef.current?.postMessage(cmd);
  }, []);

  const getBestMove = useCallback((fen: string, movetime: number): Promise<{ bestMove: string; score: string; pv: string[] }> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        resolve({ bestMove: '', score: '0', pv: [] });
        return;
      }
      currentFenRef.current = fen;
      currentScoreRef.current = '';
      currentPvRef.current = [];
      resolversRef.current.set(fen, resolve);
      workerRef.current.postMessage('stop');
      workerRef.current.postMessage(`position fen ${fen}`);
      workerRef.current.postMessage(`go movetime ${movetime}`);
    });
  }, []);

  return { sendCommand, getBestMove, isReady: isReadyRef.current };
}
