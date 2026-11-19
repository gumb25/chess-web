'use client';

import React, { useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessPiece from './ChessPiece';
import { evalBar } from '@/hooks/useEngineAnalysis';
import type { PieceColor, PieceType } from '@/lib/types';

/* ── Page layout: board on the left, panel on the right (stacked on mobile) ── */
export function BoardLayout({ board, panel, panelFirst = false }: {
  board: React.ReactNode;
  panel: React.ReactNode;
  /** On mobile, show the panel above the board (e.g. a setup form). */
  panelFirst?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-3 sm:px-6 pt-3 pb-6 lg:py-6 flex flex-col lg:flex-row lg:items-start lg:justify-center gap-4 lg:gap-8">
      <div className="board-size mx-auto lg:mx-0 lg:flex-1 flex flex-col gap-2">{board}</div>
      <aside className={`w-full max-w-[560px] mx-auto lg:mx-0 lg:w-[360px] lg:max-w-none shrink-0 flex flex-col gap-3 ${panelFirst ? 'order-first lg:order-none' : ''}`}>
        {panel}
      </aside>
    </div>
  );
}

export function Panel({ title, action, children, className = '' }: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          {title && <h3 className="eyebrow">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="hidden lg:flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── Segmented control ──────────────────────────────────────────────────── */
export function Segmented<T extends string | number>({ options, value, onChange, size = 'md' }: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex p-1 rounded-xl bg-surface-2 gap-1" role="radiogroup">
      {options.map(o => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all ${
            size === 'sm' ? 'text-xs py-1.5 px-2' : 'text-sm py-2 px-3'
          } ${value === o.value ? 'bg-surface text-fg shadow-[var(--shadow-sm)]' : 'text-muted hover:text-fg'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Vertical evaluation bar ────────────────────────────────────────────── */
export function EvalBar({ evalScore, flipped, ready = true }: { evalScore: string; flipped?: boolean; ready?: boolean }) {
  const { whiteAdvantage, label } = evalBar(evalScore);
  const whiteAhead = whiteAdvantage >= 50;
  return (
    <div
      className="relative w-3 sm:w-5 shrink-0 rounded-md overflow-hidden flex border border-line"
      style={{ background: 'var(--eval-black)', flexDirection: flipped ? 'column' : 'column-reverse' }}
      aria-label={`Evaluation ${label}`}
    >
      <div style={{ height: `${whiteAdvantage}%`, background: 'var(--eval-white)', transition: 'height 400ms ease' }}/>
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#888]/50"/>
      {ready && (
        <span
          className="hidden sm:block absolute inset-x-0 text-center text-[9px] font-bold leading-none"
          style={{
            [whiteAhead !== !!flipped ? 'bottom' : 'top']: 4,
            color: whiteAhead ? '#222' : '#ddd',
          }}
        >
          {label.replace('+', '').replace(/\.(\d)\d$/, '.$1')}
        </span>
      )}
    </div>
  );
}

/* ── Move list (SAN), clickable ─────────────────────────────────────────── */
export function MoveList({ sans, ply, onSelect, startMoveNumber = 1, blackFirst = false, empty = 'No moves yet' }: {
  sans: string[];
  ply: number; // number of moves currently applied
  onSelect?: (ply: number) => void;
  startMoveNumber?: number;
  blackFirst?: boolean;
  empty?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector('[data-current="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [ply, sans.length]);

  if (sans.length === 0) return <div className="px-4 pb-4 text-sm text-subtle">{empty}</div>;

  // Group into rows of [white, black]; pad when Black moved first.
  const cells: (string | null)[] = blackFirst ? [null, ...sans] : [...sans];
  const rows: { num: number; w: number | null; b: number | null }[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const wi = cells[i] === null ? null : (blackFirst ? i - 1 : i);
    const bi = i + 1 < cells.length ? (blackFirst ? i : i + 1) : null;
    rows.push({ num: startMoveNumber + i / 2, w: wi, b: bi });
  }

  const cell = (idx: number | null) => {
    if (idx === null) return <span className="px-2 py-1 text-subtle">…</span>;
    const current = ply === idx + 1;
    return (
      <button
        data-current={current}
        onClick={() => onSelect?.(idx + 1)}
        disabled={!onSelect}
        className={`text-left px-2 py-1 rounded-md font-semibold transition-colors ${
          current ? 'bg-accent text-accent-fg' : idx + 1 > ply ? 'text-subtle hover:bg-surface-2' : 'text-fg hover:bg-surface-2'
        }`}
      >
        {sans[idx]}
      </button>
    );
  };

  return (
    <div ref={ref} className="max-h-56 lg:max-h-72 overflow-y-auto px-2 pb-2 text-sm tabular-nums">
      {rows.map(r => (
        <div key={r.num} className="grid grid-cols-[2.25rem_1fr_1fr] items-center odd:bg-surface-2/40 rounded-md">
          <span className="pl-2 text-subtle text-xs">{r.num}.</span>
          {cell(r.w)}
          {r.b !== null ? cell(r.b) : <span/>}
        </div>
      ))}
    </div>
  );
}

/* ── Player bar with captured material ──────────────────────────────────── */
const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

// Pieces each side has captured and the resulting material lead.
export function material(chess: Chess) {
  const count = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } } as Record<PieceColor, Record<string, number>>;
  for (const row of chess.board()) for (const c of row) if (c && c.type !== 'k') count[c.color][c.type]++;
  const captured = (by: PieceColor) => {
    const opp: PieceColor = by === 'w' ? 'b' : 'w';
    const list: PieceType[] = [];
    for (const t of ['q', 'r', 'b', 'n', 'p'] as PieceType[]) {
      const n = Math.max(0, START[t] - count[opp][t]);
      for (let i = 0; i < n; i++) list.push(t);
    }
    return list;
  };
  const score = (c: PieceColor) => Object.entries(count[c]).reduce((s, [t, n]) => s + VALUES[t] * n, 0);
  return { capturedBy: { w: captured('w'), b: captured('b') }, lead: score('w') - score('b') };
}

export function PlayerBar({ name, detail, color, chess, active, avatar }: {
  name: string;
  detail?: string;
  color: PieceColor;
  chess: Chess;
  active?: boolean;
  avatar: React.ReactNode;
}) {
  const { capturedBy, lead } = material(chess);
  const caps = capturedBy[color];
  const myLead = color === 'w' ? lead : -lead;
  const oppColor: PieceColor = color === 'w' ? 'b' : 'w';
  return (
    <div className="flex items-center gap-3 px-1 h-11">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? 'ring-2 ring-accent' : ''} ${color === 'w' ? 'bg-[#f2efe8] text-[#333]' : 'bg-[#2a2825] text-[#eee]'}`}>
        {avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-fg truncate">{name}</span>
          {detail && <span className="text-xs text-subtle truncate">{detail}</span>}
        </div>
        <div className="flex items-center h-4 -space-x-1.5">
          {caps.map((t, i) => (
            <span key={i} className="opacity-80"><ChessPiece color={oppColor} type={t} size={18}/></span>
          ))}
          {myLead > 0 && <span className="pl-2.5 text-xs font-semibold text-muted">+{myLead}</span>}
        </div>
      </div>
      {active && <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-label="To move"/>}
    </div>
  );
}

/* ── Status banner ──────────────────────────────────────────────────────── */
export function Status({ tone = 'neutral', icon, title, children }: {
  tone?: 'neutral' | 'success' | 'danger' | 'info' | 'accent';
  icon?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  const tones = {
    neutral: 'bg-surface border-line',
    success: 'bg-success-soft border-transparent',
    danger: 'bg-danger-soft border-transparent',
    info: 'bg-info-soft border-transparent',
    accent: 'bg-accent-soft border-transparent',
  };
  const iconTones = {
    neutral: 'bg-surface-2 text-fg',
    success: 'bg-success text-white',
    danger: 'bg-danger text-white',
    info: 'bg-info text-white',
    accent: 'bg-accent text-accent-fg',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3.5 flex items-center gap-3 animate-fade-up ${tones[tone]}`} role="status">
      {icon && <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconTones[tone]}`}>{icon}</div>}
      <div className="min-w-0">
        <div className="font-bold text-fg leading-tight">{title}</div>
        {children && <div className="text-sm text-muted mt-0.5">{children}</div>}
      </div>
    </div>
  );
}

/* ── Small stat tile ────────────────────────────────────────────────────── */
export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'success' | 'danger' | 'accent' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent' : 'text-fg';
  return (
    <div className="flex flex-col">
      <span className={`text-2xl font-bold tabular-nums leading-tight ${color}`}>{value}</span>
      <span className="text-xs text-subtle mt-0.5">{label}</span>
    </div>
  );
}

/* ── Keyboard arrows for move navigation ───────────────────────────────── */
export function useArrowKeys(active: boolean, handlers: { left?: () => void; right?: () => void; up?: () => void; down?: () => void }) {
  const ref = useRef(handlers);
  useEffect(() => { ref.current = handlers; });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const map: Record<string, (() => void) | undefined> = {
        ArrowLeft: ref.current.left, ArrowRight: ref.current.right, ArrowUp: ref.current.up, ArrowDown: ref.current.down,
      };
      const fn = map[e.key];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}
