'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Tab, AppSettings } from '@/lib/types';
import { loadSettings, saveSettings, loadAllStats, loadDayStats, saveDayStats } from '@/lib/storage';
import type { DayStats, PuzzleResult } from '@/lib/types';

const PuzzleMode = dynamic(() => import('@/components/PuzzleMode'), { ssr: false });
const PlayMode = dynamic(() => import('@/components/PlayMode'), { ssr: false });
const AnalyzeMode = dynamic(() => import('@/components/AnalyzeMode'), { ssr: false });
const StatsView = dynamic(() => import('@/components/StatsView'), { ssr: false });
const SettingsView = dynamic(() => import('@/components/SettingsView'), { ssr: false });

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'puzzle',   label: 'Puzzles',  icon: '♟' },
  { id: 'play',     label: 'Play',     icon: '⚔' },
  { id: 'analyze',  label: 'Analyze',  icon: '🔍' },
  { id: 'stats',    label: 'Stats',    icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('puzzle');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [dayStats, setDayStats] = useState<DayStats>(loadDayStats);
  const [allStats, setAllStats] = useState<PuzzleResult[]>([]);
  const [analyzeState, setAnalyzeState] = useState<{ fen: string; moves: string[] } | null>(null);
  const [playState, setPlayState] = useState<{ fen?: string; color?: 'w' | 'b' } | null>(null);

  useEffect(() => {
    setAllStats(loadAllStats());
  }, []);

  const handleSettingsChange = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const handleDayStatsChange = (s: DayStats) => {
    setDayStats(s);
    saveDayStats(s);
    setAllStats(loadAllStats());
  };

  const handleAnalyze = (fen: string, moves: string[]) => {
    setAnalyzeState({ fen, moves });
    setTab('analyze');
  };

  const handlePlayFromHere = (fen: string, color: 'w' | 'b') => {
    setPlayState({ fen, color });
    setTab('play');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f7]">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <span className="text-xl">♔</span>
        <span className="text-lg font-bold text-gray-800 tracking-tight">Chess</span>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'puzzle' && (
          <PuzzleMode
            settings={settings}
            dayStats={dayStats}
            onDayStatsChange={handleDayStatsChange}
            onAnalyze={handleAnalyze}
          />
        )}
        {tab === 'play' && (
          <PlayMode
            key={playState ? JSON.stringify(playState) : 'default'}
            settings={settings}
            initialFen={playState?.fen}
            initialColor={playState?.color}
            onSettingsChange={handleSettingsChange}
          />
        )}
        {tab === 'analyze' && (
          <AnalyzeMode
            key={analyzeState ? JSON.stringify(analyzeState) : 'default'}
            settings={settings}
            initialFen={analyzeState?.fen}
            initialMoves={analyzeState?.moves}
            onPlayFromHere={handlePlayFromHere}
          />
        )}
        {tab === 'stats' && <StatsView results={allStats} />}
        {tab === 'settings' && <SettingsView settings={settings} onChange={handleSettingsChange} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${tab === t.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className="text-lg leading-tight">{t.icon}</span>
            <span>{t.label}</span>
            {tab === t.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gray-900 rounded-t-full"/>}
          </button>
        ))}
      </nav>
    </div>
  );
}
