import { AppSettings, DEFAULT_SETTINGS, DayStats, PuzzleResult } from './types';

const SETTINGS_KEY = 'chess_settings';
const STATS_KEY = 'chess_stats';
const DAY_STATS_KEY = 'chess_day_stats';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadAllStats(): PuzzleResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveResult(result: PuzzleResult): void {
  if (typeof window === 'undefined') return;
  const all = loadAllStats();
  const exists = all.find(r => r.puzzleId === result.puzzleId);
  if (!exists) all.push(result);
  localStorage.setItem(STATS_KEY, JSON.stringify(all));
}

export function loadDayStats(): DayStats {
  if (typeof window === 'undefined') return { date: '', correct: 0, incorrect: 0, played: 0 };
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(DAY_STATS_KEY);
    if (raw) {
      const stats: DayStats = JSON.parse(raw);
      if (stats.date === today) return stats;
    }
  } catch { /* */ }
  return { date: today, correct: 0, incorrect: 0, played: 0 };
}

export function saveDayStats(stats: DayStats): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DAY_STATS_KEY, JSON.stringify(stats));
}
