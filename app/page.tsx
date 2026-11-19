'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ChessPiece from '@/components/ChessPiece';
import { Tab, AppSettings } from '@/lib/types';
import { loadSettings, saveSettings, loadAllStats, loadDayStats, saveDayStats } from '@/lib/storage';
import type { DayStats, PuzzleResult } from '@/lib/types';
import {
  HomeIcon, TargetIcon, SwordsIcon, BookIcon, MicroscopeIcon, TrophyIcon, SettingsIcon,
} from '@/components/Icons';

const HomeView = dynamic(() => import('@/components/HomeView'), { ssr: false });
const PuzzleMode = dynamic(() => import('@/components/PuzzleMode'), { ssr: false });
const PlayMode = dynamic(() => import('@/components/PlayMode'), { ssr: false });
const AnalyzeMode = dynamic(() => import('@/components/AnalyzeMode'), { ssr: false });
const OpeningMode = dynamic(() => import('@/components/OpeningMode'), { ssr: false });
const StatsView = dynamic(() => import('@/components/StatsView'), { ssr: false });
const SettingsView = dynamic(() => import('@/components/SettingsView'), { ssr: false });

type NavItem = { id: Tab; label: string; Icon: (p: { size?: number }) => React.ReactNode };

// Primary destinations: shown in the sidebar and the mobile tab bar.
const PRIMARY: NavItem[] = [
  { id: 'home',     label: 'Home',     Icon: HomeIcon },
  { id: 'puzzle',   label: 'Puzzles',  Icon: TargetIcon },
  { id: 'play',     label: 'Play',     Icon: SwordsIcon },
  { id: 'openings', label: 'Openings', Icon: BookIcon },
  { id: 'analyze',  label: 'Analysis', Icon: MicroscopeIcon },
];
// Secondary: sidebar only on desktop; on mobile, reached from the header.
const SECONDARY: NavItem[] = [
  { id: 'progress', label: 'Progress', Icon: TrophyIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

const TITLES: Record<Tab, string> = {
  home: 'Chess', puzzle: 'Puzzles', play: 'Play', openings: 'Openings',
  analyze: 'Analysis', progress: 'Progress', settings: 'Settings',
};

type AnalyzeState = { fen: string; moves: string[]; playerColor?: 'w' | 'b' };

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-accent text-accent-fg flex items-center justify-center shadow-[var(--shadow-sm)]">
        <ChessPiece color="w" type="n" size={30}/>
      </div>
      <span className="text-lg font-bold tracking-tight text-fg">Chess</span>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [dayStats, setDayStats] = useState<DayStats>(loadDayStats);
  const [allStats, setAllStats] = useState<PuzzleResult[]>(loadAllStats);
  // Modes stay mounted once opened (just hidden), so switching tabs doesn't
  // throw away an in-progress game, puzzle or opening line.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set());
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState | null>(null);
  const [playState, setPlayState] = useState<{ fen?: string; color?: 'w' | 'b' } | null>(null);

  // Apply the Light/Dark choice. "System" removes the override.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.appearance === 'light' || settings.appearance === 'dark') root.dataset.theme = settings.appearance;
    else delete root.dataset.theme;
  }, [settings.appearance]);

  const handleSettingsChange = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const handleDayStatsChange = (s: DayStats) => {
    setDayStats(s);
    saveDayStats(s);
    setAllStats(loadAllStats());
  };

  const goTo = (t: Tab) => {
    setTab(t);
    if (!visited.has(t)) setVisited(v => new Set(v).add(t));
    window.scrollTo(0, 0);
  };

  const handleAnalyze = (fen: string, moves: string[], playerColor?: 'w' | 'b') => {
    setAnalyzeState({ fen, moves, playerColor });
    goTo('analyze');
  };

  const handlePlayFromHere = (fen: string, color: 'w' | 'b') => {
    setPlayState({ fen, color });
    goTo('play');
  };

  const show = (t: Tab) => visited.has(t) || tab === t;

  const navButton = (item: NavItem) => {
    const active = tab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => goTo(item.id)}
        aria-current={active ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-semibold transition-colors ${
          active ? 'bg-accent-soft text-accent-soft-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
        }`}
      >
        <item.Icon size={20}/>
        {item.label}
      </button>
    );
  };

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside aria-label="Sidebar" className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-line bg-surface px-4 py-5 z-30">
        <button onClick={() => goTo('home')} className="px-2 mb-8 text-left" aria-label="Home">
          <Logo/>
        </button>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {PRIMARY.map(navButton)}
        </nav>
        <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-line">
          {SECONDARY.map(navButton)}
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-bg/85 backdrop-blur-md border-b border-line">
        {tab === 'home' ? <Logo/> : <h1 className="text-lg font-bold tracking-tight text-fg">{TITLES[tab]}</h1>}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo('progress')}
            className={`btn btn-ghost btn-icon ${tab === 'progress' ? 'text-accent' : ''}`}
            aria-label="Progress"
          >
            <TrophyIcon/>
          </button>
          <button
            onClick={() => goTo('settings')}
            className={`btn btn-ghost btn-icon ${tab === 'settings' ? 'text-accent' : ''}`}
            aria-label="Settings"
          >
            <SettingsIcon/>
          </button>
        </div>
      </header>

      <main className="pb-24 lg:pb-0">
        {tab === 'home' && (
          <HomeView
            dayStats={dayStats}
            allStats={allStats}
            onNavigate={goTo}
          />
        )}
        {show('puzzle') && <div hidden={tab !== 'puzzle'}>
          <PuzzleMode
            settings={settings}
            dayStats={dayStats}
            onDayStatsChange={handleDayStatsChange}
            onAnalyze={(fen, moves, playerColor) => handleAnalyze(fen, moves, playerColor)}
            onOpenSettings={() => goTo('settings')}
          />
        </div>}
        {show('play') && <div hidden={tab !== 'play'}>
          <PlayMode
            key={playState ? JSON.stringify(playState) : 'default'}
            settings={settings}
            initialFen={playState?.fen}
            initialColor={playState?.color}
            onSettingsChange={handleSettingsChange}
            onAnalyze={handleAnalyze}
          />
        </div>}
        {show('analyze') && <div hidden={tab !== 'analyze'}>
          <AnalyzeMode
            key={analyzeState ? JSON.stringify(analyzeState) : 'default'}
            settings={settings}
            active={tab === 'analyze'}
            initialFen={analyzeState?.fen}
            initialMoves={analyzeState?.moves}
            initialPlayerColor={analyzeState?.playerColor}
            onPlayFromHere={handlePlayFromHere}
          />
        </div>}
        {show('openings') && <div hidden={tab !== 'openings'}>
          <OpeningMode settings={settings} active={tab === 'openings'} onPlayFromHere={handlePlayFromHere}/>
        </div>}
        {tab === 'progress' && <StatsView results={allStats} dayStats={dayStats} onPuzzle={() => goTo('puzzle')}/>}
        {tab === 'settings' && <SettingsView settings={settings} onChange={handleSettingsChange}/>}
      </main>

      {/* Mobile tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main"
      >
        {PRIMARY.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => goTo(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold transition-colors ${
                active ? 'text-accent' : 'text-subtle hover:text-fg'
              }`}
            >
              <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${active ? 'bg-accent-soft' : ''}`}>
                <t.Icon size={20}/>
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
