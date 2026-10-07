'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Tab, AppSettings } from '@/lib/types';
import { loadSettings, saveSettings, loadAllStats, loadDayStats, saveDayStats } from '@/lib/storage';
import type { DayStats, PuzzleResult } from '@/lib/types';
import { setSoundEnabled } from '@/lib/sound';

const HomeView = dynamic(() => import('@/components/HomeView'), { ssr: false });
const PuzzleMode = dynamic(() => import('@/components/PuzzleMode'), { ssr: false });
const PlayMode = dynamic(() => import('@/components/PlayMode'), { ssr: false });
const AnalyzeMode = dynamic(() => import('@/components/AnalyzeMode'), { ssr: false });
const OpeningMode = dynamic(() => import('@/components/OpeningMode'), { ssr: false });
const StatsView = dynamic(() => import('@/components/StatsView'), { ssr: false });
const SettingsView = dynamic(() => import('@/components/SettingsView'), { ssr: false });

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'puzzle',   label: 'Puzzles',  icon: '♟' },
  { id: 'play',     label: 'Play',     icon: '⚔' },
  { id: 'openings', label: 'Learn',    icon: '📖' },
  { id: 'analyze',  label: 'Analyze',  icon: '🔍' },
  { id: 'stats',    label: 'Stats',    icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [dayStats, setDayStats] = useState<DayStats>(loadDayStats);
  const [allStats, setAllStats] = useState<PuzzleResult[]>(loadAllStats);
  // Tabs stay mounted once opened (just hidden), so switching tabs doesn't
  // throw away an in-progress game, puzzle or opening line.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set());
  const [analyzeState, setAnalyzeState] = useState<{ fen: string; moves: string[]; playerColor?: 'w' | 'b' } | null>(null);
  const [playState, setPlayState] = useState<{ fen?: string; color?: 'w' | 'b' } | null>(null);

  // Keep the sound module in sync with the user's setting.
  useEffect(() => {
    setSoundEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

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
    if (t !== 'home' && !visited.has(t)) setVisited(v => new Set(v).add(t));
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

  return (
    <>
      {tab === 'home' && (
        <HomeView
          dayStats={dayStats}
          onPuzzle={() => goTo('puzzle')}
          onPlay={() => goTo('play')}
          onLearn={() => goTo('openings')}
        />
      )}
      <div className={`min-h-screen flex-col bg-[#f8f8f7] ${tab === 'home' ? 'hidden' : 'flex'}`}>
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => goTo('home')}
            className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
            aria-label="Home"
          >
            ‹
          </button>
          <span className="text-xl select-none">♔</span>
          <span className="text-lg font-bold text-gray-800 tracking-tight">Chess</span>
        </header>

        <main className="flex-1 overflow-y-auto pb-28">
          {show('puzzle') && <div hidden={tab !== 'puzzle'}>
            <PuzzleMode
              settings={settings}
              dayStats={dayStats}
              onDayStatsChange={handleDayStatsChange}
              onAnalyze={(fen, moves, playerColor) => handleAnalyze(fen, moves, playerColor)}
            />
          </div>}
          {show('play') && <div hidden={tab !== 'play'}>
            <PlayMode
              key={playState ? JSON.stringify(playState) : 'default'}
              settings={settings}
              initialFen={playState?.fen}
              initialColor={playState?.color}
              onSettingsChange={handleSettingsChange}
            />
          </div>}
          {show('analyze') && <div hidden={tab !== 'analyze'}>
            <AnalyzeMode
              key={analyzeState ? JSON.stringify(analyzeState) : 'default'}
              settings={settings}
              initialFen={analyzeState?.fen}
              initialMoves={analyzeState?.moves}
              initialPlayerColor={analyzeState?.playerColor}
              onPlayFromHere={handlePlayFromHere}
            />
          </div>}
          {show('openings') && <div hidden={tab !== 'openings'}><OpeningMode settings={settings} /></div>}
          {tab === 'stats' && <StatsView results={allStats} />}
          {tab === 'settings' && <SettingsView settings={settings} onChange={handleSettingsChange} />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
          {TABS.map(t => (
            <button key={t.id} onClick={() => goTo(t.id)}
              className={`relative flex-1 flex flex-col items-center pt-2 pb-5 gap-0.5 text-[10px] font-medium transition-colors ${tab === t.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
              <span className="text-lg leading-tight">{t.icon}</span>
              <span>{t.label}</span>
              {tab === t.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gray-900 rounded-t-full"/>}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
