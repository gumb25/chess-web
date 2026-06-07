'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface StockfishResult {
  bestMove: string;
  score: string;
  pv: string[];
}

interface StockfishHook {
  sendCommand: (cmd: string) => void;
  getBestMove: (fen: string, movetime: number) => Promise<StockfishResult>;
  isReady: boolean;
}

export function useStockfish(onReady?: () => void): StockfishHook {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Single pending resolver — only one analysis can be in flight at a time.
  const pendingResolverRef = useRef<((v: StockfishResult) => void) | null>(null);
  const currentScoreRef = useRef('');
  const currentPvRef = useRef<string[]>([]);

  // When we call `stop` while the engine is running, the engine emits a
  // spurious `bestmove` before the real one from the subsequent `go`.
  // Track that so we skip it.
  const isEngineRunningRef = useRef(false);
  const skipNextBestmoveRef = useRef(false);

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
        setIsReady(true);
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
        // Ignore the spurious bestmove emitted when we stopped a running engine.
        if (skipNextBestmoveRef.current) {
          skipNextBestmoveRef.current = false;
          return;
        }
        isEngineRunningRef.current = false;
        const bestMove = line.split(' ')[1] ?? '';
        const resolver = pendingResolverRef.current;
        pendingResolverRef.current = null;
        resolver?.({ bestMove, score: currentScoreRef.current, pv: currentPvRef.current });
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

  const getBestMove = useCallback((fen: string, movetime: number): Promise<StockfishResult> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        resolve({ bestMove: '', score: '0', pv: [] });
        return;
      }
      // If the engine is mid-calculation, `stop` will trigger a bestmove we must ignore.
      if (isEngineRunningRef.current) {
        skipNextBestmoveRef.current = true;
      }
      pendingResolverRef.current = resolve;
      currentScoreRef.current = '';
      currentPvRef.current = [];
      workerRef.current.postMessage('stop');
      workerRef.current.postMessage(`position fen ${fen}`);
      workerRef.current.postMessage(`go movetime ${movetime}`);
      isEngineRunningRef.current = true;
    });
  }, []);

  return { sendCommand, getBestMove, isReady };
}
