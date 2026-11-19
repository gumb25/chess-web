'use client';

import React from 'react';
import { DayStats, PuzzleResult } from '@/lib/types';
import { PageHeader } from './ui';
import { ArrowRightIcon, TrophyIcon } from './Icons';

interface Props {
  results: PuzzleResult[];
  dayStats: DayStats;
  onPuzzle?: () => void;
}

function Ring({ pct, size = 132 }: { pct: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke}/>
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--success)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        style={{ transition: 'stroke-dashoffset 600ms ease' }}
      />
    </svg>
  );
}

export default function StatsView({ results, dayStats, onPuzzle }: Props) {
  const total = results.length;
  const solved = results.filter(r => r.solved).length;
  const withHelp = results.filter(r => r.usedHint).length;
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  const todayPct = dayStats.played > 0 ? Math.round((dayStats.correct / dayStats.played) * 100) : null;

  const tile = (label: string, value: React.ReactNode, cls = 'text-fg') => (
    <div className="card p-4">
      <div className={`text-3xl font-bold tabular-nums ${cls}`}>{value}</div>
      <div className="text-sm text-subtle mt-1">{label}</div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 sm:px-6 py-6 lg:py-10 animate-fade-up">
      <PageHeader title="Progress" subtitle="Your puzzle record, saved on this device."/>

      {total === 0 ? (
        <div className="card p-8 sm:p-12 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-2xl bg-accent-soft text-accent-soft-fg flex items-center justify-center"><TrophyIcon size={28}/></span>
          <h2 className="text-lg font-bold text-fg">No puzzles yet</h2>
          <p className="text-muted max-w-sm">Solve a few puzzles and your accuracy and totals will show up here.</p>
          <button onClick={onPuzzle} className="btn btn-primary mt-2">Start solving <ArrowRightIcon size={18}/></button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <section className="card p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <Ring pct={pct}/>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums text-fg">{pct}%</span>
                <span className="text-xs text-subtle">success</span>
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="eyebrow">All time</div>
              <div className="text-xl font-bold text-fg mt-1">{solved} of {total} puzzles solved cleanly</div>
              <p className="text-sm text-muted mt-1">A puzzle only counts as solved if you got every move without a hint or the solution.</p>
              <div className="mt-4 h-2.5 rounded-full bg-danger-soft overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }}/>
              </div>
              <div className="flex justify-between text-xs text-subtle mt-1.5">
                <span>{solved} solved</span><span>{total - solved} missed</span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tile('Attempted', total)}
            {tile('Solved', solved, 'text-success')}
            {tile('Used help', withHelp, 'text-accent')}
            {tile('Today', todayPct === null ? '–' : `${todayPct}%`)}
          </div>

          <section className="card p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="eyebrow">Today</div>
              <div className="text-sm text-muted mt-1">
                {dayStats.played === 0 ? 'Nothing played yet today.' : `${dayStats.correct} solved and ${dayStats.incorrect} missed out of ${dayStats.played}.`}
              </div>
            </div>
            <button onClick={onPuzzle} className="btn btn-primary">Keep training <ArrowRightIcon size={18}/></button>
          </section>
        </div>
      )}
    </div>
  );
}
