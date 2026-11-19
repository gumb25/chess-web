'use client';

import React, { useMemo } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import type { DayStats, PuzzleResult, Tab } from '@/lib/types';
import { TargetIcon, SwordsIcon, BookIcon, MicroscopeIcon, ArrowRightIcon, ChevronRightIcon } from './Icons';

interface Props {
  dayStats: DayStats;
  allStats: PuzzleResult[];
  onNavigate: (t: Tab) => void;
}

const MODES: { id: Tab; title: string; text: string; Icon: (p: { size?: number }) => React.ReactNode; tint: string }[] = [
  { id: 'puzzle',   title: 'Puzzles',  text: 'Find the winning move in real game positions.', Icon: TargetIcon,     tint: 'bg-accent-soft text-accent-soft-fg' },
  { id: 'play',     title: 'Play',     text: 'Take on Stockfish at any strength, with hints.', Icon: SwordsIcon,     tint: 'bg-success-soft text-success' },
  { id: 'openings', title: 'Openings', text: 'Explore named openings and popular replies.',     Icon: BookIcon,       tint: 'bg-info-soft text-info' },
  { id: 'analyze',  title: 'Analysis', text: 'Set up any position and see the engine’s view.',  Icon: MicroscopeIcon, tint: 'bg-surface-2 text-fg' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function HomeView({ dayStats, allStats, onNavigate }: Props) {
  // A static Italian Game position decorates the hero.
  const heroBoard = useMemo(() => new Chess('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'), []);
  const accuracy = dayStats.played > 0 ? Math.round((dayStats.correct / dayStats.played) * 100) : null;
  const solvedAllTime = allStats.filter(r => r.solved).length;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 py-6 lg:py-10 flex flex-col gap-6 lg:gap-8 animate-fade-up">
      <div>
        <p className="text-sm font-semibold text-accent">{greeting()}</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg mt-1">Ready for some chess?</h1>
      </div>

      {/* Hero */}
      <section className="card p-5 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-10 overflow-hidden relative">
        <div className="flex-1 min-w-0 relative z-10">
          <span className="eyebrow">Daily training</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg mt-2 leading-tight">
            Sharpen your tactics,<br className="hidden sm:block"/> one puzzle at a time
          </h2>
          <p className="text-muted mt-3 max-w-md">
            Thousands of rated puzzles from real games. Get it wrong? Retry the exact move or watch the solution play out.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <button onClick={() => onNavigate('puzzle')} className="btn btn-primary px-5 h-12 text-base">
              Start solving <ArrowRightIcon size={18}/>
            </button>
            <button onClick={() => onNavigate('play')} className="btn btn-secondary px-5 h-12 text-base">
              Play the computer
            </button>
          </div>
        </div>
        <div className="hidden sm:block w-full max-w-[280px] mx-auto md:mx-0 shrink-0 pointer-events-none rotate-[-2deg]" aria-hidden="true">
          <ChessBoard chess={heroBoard} disabled lastMove={{ from: 'f1', to: 'c4' }}/>
        </div>
      </section>

      {/* Today */}
      <section className="card p-4 sm:p-5 flex items-center gap-4 sm:gap-8 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <div className="eyebrow">Today</div>
          <div className="text-sm text-muted mt-1">
            {dayStats.played === 0 ? 'No puzzles yet today. A few minutes keeps you sharp.' : `${dayStats.played} puzzle${dayStats.played === 1 ? '' : 's'} played`}
          </div>
        </div>
        <div className="flex gap-6 sm:gap-10">
          <div><div className="text-2xl font-bold tabular-nums text-success">{dayStats.correct}</div><div className="text-xs text-subtle">Solved</div></div>
          <div><div className="text-2xl font-bold tabular-nums text-fg">{accuracy === null ? '–' : `${accuracy}%`}</div><div className="text-xs text-subtle">Accuracy</div></div>
          <div><div className="text-2xl font-bold tabular-nums text-fg">{solvedAllTime}</div><div className="text-xs text-subtle">All-time</div></div>
        </div>
        <button onClick={() => onNavigate('progress')} className="btn btn-ghost -mr-2">
          Progress <ChevronRightIcon size={16}/>
        </button>
      </section>

      {/* Modes */}
      <section>
        <h2 className="eyebrow mb-3">Explore</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => onNavigate(m.id)}
              className="card p-4 sm:p-5 text-left flex sm:flex-col items-center sm:items-start gap-4 hover:border-line-strong hover:shadow-[var(--shadow-md)] active:scale-[0.99] transition-all group"
            >
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${m.tint}`}>
                <m.Icon size={24}/>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-fg">{m.title}</span>
                <span className="block text-sm text-muted mt-0.5">{m.text}</span>
              </span>
              <span className="sm:hidden text-subtle group-hover:text-fg transition-colors"><ChevronRightIcon/></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
