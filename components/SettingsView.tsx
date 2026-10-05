'use client';

import React, { useState } from 'react';
import { AppSettings, ALL_PUZZLE_THEMES, BoardTheme, BOARD_THEMES } from '@/lib/types';

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}

export default function SettingsView({ settings, onChange }: Props) {
  const [themesOpen, setThemesOpen] = useState(false);
  // A stored empty list means "no filter" (every type). While the user has
  // just cleared every box we show them all unchecked, so the next tick
  // starts a fresh selection instead of unchecking one of "all".
  const [noneChecked, setNoneChecked] = useState(false);

  const update = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

  const allSelected = settings.puzzleThemes.length === 0 || settings.puzzleThemes.length === ALL_PUZZLE_THEMES.length;
  const isChecked = (t: string) => !noneChecked && (allSelected || settings.puzzleThemes.includes(t));

  const setThemes = (themes: string[]) => {
    setNoneChecked(themes.length === 0);
    update({ puzzleThemes: themes.length === ALL_PUZZLE_THEMES.length ? [] : themes });
  };

  const toggleTheme = (t: string) => {
    const checked = ALL_PUZZLE_THEMES.filter(isChecked);
    setThemes(checked.includes(t) ? checked.filter(x => x !== t) : [...checked, t]);
  };

  const selectAll = () => {
    setNoneChecked(false);
    update({ puzzleThemes: [] });
  };

  const themesSummary = noneChecked
    ? 'None (all puzzles)'
    : allSelected
    ? `All (${ALL_PUZZLE_THEMES.length})`
    : `${settings.puzzleThemes.length} of ${ALL_PUZZLE_THEMES.length}`;

  return (
    <div className="flex flex-col gap-5 py-6 px-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="text-sm font-medium text-gray-600 mb-3">Board Theme</div>
        <div className="flex gap-2">
          {(Object.keys(BOARD_THEMES) as BoardTheme[]).map(t => (
            <button key={t} onClick={() => update({ boardTheme: t })}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-colors ${settings.boardTheme === t ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {(Object.keys(BOARD_THEMES) as BoardTheme[]).map(t => (
            <div key={t} className="flex-1 flex rounded-lg overflow-hidden h-8 border border-gray-100">
              <div className="flex-1" style={{ background: BOARD_THEMES[t].light }}/>
              <div className="flex-1" style={{ background: BOARD_THEMES[t].dark }}/>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-600">Move Sounds</div>
          <div className="text-xs text-gray-400 mt-0.5">Play a sound on each move</div>
        </div>
        <button
          onClick={() => update({ soundEnabled: !settings.soundEnabled })}
          role="switch"
          aria-checked={settings.soundEnabled}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.soundEnabled ? 'bg-gray-800' : 'bg-gray-300'}`}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="text-sm font-medium text-gray-600 mb-3">Puzzle Difficulty</div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-gray-500 w-20">Min Rating</span>
          <input type="range" min={400} max={2400} step={100} value={settings.minRating}
            onChange={e => { const v = +e.target.value; update({ minRating: v, maxRating: Math.max(v, settings.maxRating) }); }} className="flex-1 accent-gray-800"/>
          <span className="text-sm font-medium text-gray-700 w-12 text-right">{settings.minRating}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-20">Max Rating</span>
          <input type="range" min={800} max={2800} step={100} value={settings.maxRating}
            onChange={e => { const v = +e.target.value; update({ maxRating: v, minRating: Math.min(v, settings.minRating) }); }} className="flex-1 accent-gray-800"/>
          <span className="text-sm font-medium text-gray-700 w-12 text-right">{settings.maxRating}</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <button onClick={() => setThemesOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <span>Puzzle Types</span>
          <span className="text-gray-400 text-xs">{themesSummary} {themesOpen ? '▲' : '▼'}</span>
        </button>
        {themesOpen && (
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2 mb-2">
              <button onClick={selectAll}
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Select All</button>
              <button onClick={() => setThemes([])}
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Deselect All</button>
            </div>
            <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5">
              {ALL_PUZZLE_THEMES.map(t => (
                <button key={t} onClick={() => toggleTheme(t)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors w-full">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs transition-colors ${isChecked(t) ? 'bg-gray-800 border-gray-800 text-white' : 'border-gray-300'}`}>
                    {isChecked(t) ? '✓' : ''}
                  </span>
                  <span className="text-sm text-gray-700">{t}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
