'use client';

import React from 'react';
import type { DayStats } from '@/lib/types';

interface Props {
  dayStats: DayStats;
  onPuzzle: () => void;
  onPlay: () => void;
  onLearn: () => void;
}

export default function HomeView({ dayStats, onPuzzle, onPlay, onLearn }: Props) {
  const accuracy = dayStats.played > 0
    ? Math.round((dayStats.correct / dayStats.played) * 100)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f7]">
      {/* Hero */}
      <div className="flex flex-col items-center px-6 pt-10 pb-8 gap-8">
        <div className="text-center">
          <div className="text-6xl mb-3 select-none">♔</div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Chess</h1>
          <p className="text-gray-400 mt-1.5 text-base">Train. Play. Improve.</p>
        </div>

        {/* Action cards */}
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={onPuzzle}
            className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center gap-5 shadow-sm hover:shadow-md hover:border-gray-300 active:scale-[0.98] transition-all text-left"
          >
            <span className="text-4xl select-none">♟</span>
            <div>
              <div className="text-lg font-bold text-gray-900">Solve a Puzzle</div>
              <div className="text-sm text-gray-400 mt-0.5">Sharpen your tactics</div>
            </div>
            <span className="ml-auto text-gray-300 text-xl">›</span>
          </button>

          <button
            onClick={onPlay}
            className="w-full bg-gray-900 rounded-2xl px-6 py-5 flex items-center gap-5 shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
          >
            <span className="text-4xl select-none">⚔</span>
            <div>
              <div className="text-lg font-bold text-white">Play vs Computer</div>
              <div className="text-sm text-gray-400 mt-0.5">Challenge Stockfish</div>
            </div>
            <span className="ml-auto text-gray-600 text-xl">›</span>
          </button>

          <button
            onClick={onLearn}
            className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center gap-5 shadow-sm hover:shadow-md hover:border-gray-300 active:scale-[0.98] transition-all text-left"
          >
            <span className="text-4xl select-none">📖</span>
            <div>
              <div className="text-lg font-bold text-gray-900">Learn Openings</div>
              <div className="text-sm text-gray-400 mt-0.5">Explore opening theory</div>
            </div>
            <span className="ml-auto text-gray-300 text-xl">›</span>
          </button>
        </div>

        {/* Today's stats — only shown once user has played */}
        {dayStats.played > 0 && (
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">Today</div>
            <div className="flex gap-6 text-sm">
              <span>
                <span className="font-semibold text-green-600">{dayStats.correct}</span>
                <span className="text-gray-400 ml-1">correct</span>
              </span>
              <span>
                <span className="font-semibold text-red-500">{dayStats.incorrect}</span>
                <span className="text-gray-400 ml-1">wrong</span>
              </span>
              {accuracy !== null && (
                <span>
                  <span className="font-semibold text-gray-700">{accuracy}%</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
