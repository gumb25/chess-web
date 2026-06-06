'use client';

import React from 'react';
import { PuzzleResult } from '@/lib/types';

interface Props {
  results: PuzzleResult[];
}

export default function StatsView({ results }: Props) {
  const total = results.length;
  const solved = results.filter(r => r.solved).length;
  const perfect = results.filter(r => r.solved && !r.usedHint).length;
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800">All-Time Stats</h2>
      <div className="w-full grid grid-cols-2 gap-3">
        {[
          { label: 'Attempted', value: total, color: 'text-gray-800' },
          { label: 'Solved', value: solved, color: 'text-green-600' },
          { label: 'Perfect', value: perfect, color: 'text-blue-600' },
          { label: 'Success Rate', value: `${pct}%`, color: pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="w-full bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Overall Progress</div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }}/>
          </div>
          <div className="text-xs text-gray-400 mt-1">{solved} of {total} solved</div>
        </div>
      )}
      {total === 0 && (
        <div className="text-gray-400 text-sm mt-4">Solve some puzzles to see your stats here.</div>
      )}
    </div>
  );
}
