'use client';

import React, { useState } from 'react';
import { AppSettings, ALL_PUZZLE_THEMES, BoardTheme, BOARD_THEMES, Appearance, themeLabel, skillLabel } from '@/lib/types';
import { PageHeader, Segmented } from './ui';
import { SunIcon, MoonIcon, MonitorIcon, CheckIcon, ChevronRightIcon } from './Icons';
import ChessPiece from './ChessPiece';

const DIFFICULTY_PRESETS = [
  { label: 'Beginner', min: 400, max: 1200 },
  { label: 'Intermediate', min: 1000, max: 1800 },
  { label: 'Advanced', min: 1600, max: 2400 },
  { label: 'Expert', min: 2000, max: 2800 },
  { label: 'Any', min: 400, max: 2800 },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-bold text-fg">{title}</h2>
      {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

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
    ? 'None selected, so all puzzles are used'
    : allSelected
    ? `All ${ALL_PUZZLE_THEMES.length} types`
    : `${settings.puzzleThemes.length} of ${ALL_PUZZLE_THEMES.length} types selected`;

  const preset = DIFFICULTY_PRESETS.find(p => p.min === settings.minRating && p.max === settings.maxRating);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 sm:px-6 py-6 lg:py-10 animate-fade-up">
      <PageHeader title="Settings" subtitle="Saved automatically on this device."/>
      <div className="flex flex-col gap-4">
        <Section title="Appearance">
          <Segmented<Appearance>
            value={settings.appearance}
            onChange={v => update({ appearance: v })}
            options={[
              { value: 'system', label: <><MonitorIcon size={16}/> System</> },
              { value: 'light', label: <><SunIcon size={16}/> Light</> },
              { value: 'dark', label: <><MoonIcon size={16}/> Dark</> },
            ]}
          />
        </Section>

        <Section title="Board">
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(BOARD_THEMES) as BoardTheme[]).map(t => {
              const c = BOARD_THEMES[t];
              const active = settings.boardTheme === t;
              return (
                <button
                  key={t}
                  onClick={() => update({ boardTheme: t })}
                  aria-pressed={active}
                  className={`rounded-xl p-1.5 border-2 transition-all text-left ${active ? 'border-accent' : 'border-transparent hover:border-line-strong'}`}
                >
                  <div className="relative grid grid-cols-4 rounded-lg overflow-hidden aspect-square">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} style={{ background: (Math.floor(i / 4) + i) % 2 === 0 ? c.light : c.dark }}/>
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center gap-0 pointer-events-none">
                      <ChessPiece color="w" type="n" size={40}/>
                      <ChessPiece color="b" type="q" size={40}/>
                    </div>
                    {active && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-accent-fg flex items-center justify-center"><CheckIcon size={13}/></span>
                    )}
                  </div>
                  <div className={`text-sm font-semibold mt-2 px-1 ${active ? 'text-fg' : 'text-muted'}`}>{c.label}</div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Puzzle difficulty" description={`Puzzles rated ${settings.minRating}–${settings.maxRating}.`}>
          <div className="flex flex-wrap gap-2 mb-5">
            {DIFFICULTY_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => update({ minRating: p.min, maxRating: p.max })}
                className={`chip py-1.5 px-3 text-sm font-semibold transition-colors ${preset === p ? 'bg-accent text-accent-fg' : 'hover:text-fg'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3">
              <span className="text-sm text-muted w-24">Minimum</span>
              <input type="range" min={400} max={2400} step={100} value={settings.minRating}
                onChange={e => { const v = +e.target.value; update({ minRating: v, maxRating: Math.max(v, settings.maxRating) }); }}
                className="range flex-1"/>
              <span className="text-sm font-semibold text-fg w-12 text-right tabular-nums">{settings.minRating}</span>
            </label>
            <label className="flex items-center gap-3">
              <span className="text-sm text-muted w-24">Maximum</span>
              <input type="range" min={800} max={2800} step={100} value={settings.maxRating}
                onChange={e => { const v = +e.target.value; update({ maxRating: v, minRating: Math.min(v, settings.minRating) }); }}
                className="range flex-1"/>
              <span className="text-sm font-semibold text-fg w-12 text-right tabular-nums">{settings.maxRating}</span>
            </label>
          </div>
        </Section>

        <section className="card overflow-hidden">
          <button onClick={() => setThemesOpen(o => !o)} className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-surface-2/50 transition-colors" aria-expanded={themesOpen}>
            <div>
              <h2 className="font-bold text-fg">Puzzle types</h2>
              <p className="text-sm text-muted mt-0.5">{themesSummary}</p>
            </div>
            <span className={`text-subtle transition-transform ${themesOpen ? 'rotate-90' : ''}`}><ChevronRightIcon/></span>
          </button>
          {themesOpen && (
            <div className="px-5 pb-5">
              <div className="flex gap-2 mb-3">
                <button onClick={selectAll} className="btn btn-secondary h-8 min-h-0 text-xs">Select all</button>
                <button onClick={() => setThemes([])} className="btn btn-ghost h-8 min-h-0 text-xs">Clear</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PUZZLE_THEMES.map(t => {
                  const on = isChecked(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTheme(t)}
                      aria-pressed={on}
                      className={`chip py-1.5 px-3 text-[13px] border transition-colors ${on ? 'bg-accent-soft text-accent-soft-fg border-transparent font-semibold' : 'bg-surface border-line hover:border-line-strong'}`}
                    >
                      {on && <CheckIcon size={13}/>}{themeLabel(t)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <Section title="Computer opponent" description="Default strength for new games. You can also change it mid-game.">
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={20} value={settings.engineSkill}
              onChange={e => update({ engineSkill: +e.target.value })} className="range flex-1" aria-label="Engine skill level"/>
            <span className="text-sm font-semibold text-fg w-32 text-right">{skillLabel(settings.engineSkill)} · {settings.engineSkill}</span>
          </div>
        </Section>
      </div>
    </div>
  );
}
