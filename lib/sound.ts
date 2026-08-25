// Move-sound playback. Preloads a small set of audio clips and plays the right
// one for a given move. Safe to call on the server (no-ops) and tolerant of the
// browser autoplay policy (failed plays are ignored). Respects a global
// enabled flag driven by the user's sound setting.

type SoundName = 'move' | 'capture' | 'check' | 'gameEnd';

const FILES: Record<SoundName, string> = {
  move: '/sounds/Move.mp3',
  capture: '/sounds/Capture.mp3',
  check: '/sounds/Check.mp3',
  gameEnd: '/sounds/GameEnd.mp3',
};

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

let enabled = true;
export function setSoundEnabled(value: boolean) {
  enabled = value;
}

function get(name: SoundName): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!cache[name]) {
    const audio = new Audio(FILES[name]);
    audio.preload = 'auto';
    cache[name] = audio;
  }
  return cache[name] ?? null;
}

// The browser won't decode/unlock audio until the first user gesture, so the
// first real play() would otherwise be noticeably delayed. Prime every clip
// once (play muted, then reset) on the first interaction so subsequent plays
// — including the very first move — are instant.
let primed = false;
function primeSounds() {
  if (primed || typeof window === 'undefined') return;
  primed = true;
  (Object.keys(FILES) as SoundName[]).forEach(name => {
    const audio = get(name);
    if (!audio) return;
    const prevVolume = audio.volume;
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = prevVolume;
    }).catch(() => {
      audio.volume = prevVolume;
    });
  });
}

if (typeof window !== 'undefined') {
  const onFirstGesture = () => {
    primeSounds();
    window.removeEventListener('pointerdown', onFirstGesture);
    window.removeEventListener('keydown', onFirstGesture);
    window.removeEventListener('touchstart', onFirstGesture);
  };
  window.addEventListener('pointerdown', onFirstGesture);
  window.addEventListener('keydown', onFirstGesture);
  window.addEventListener('touchstart', onFirstGesture);
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  const audio = get(name);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    // Autoplay may reject until the user interacts; ignore that rejection.
    audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

// A chess.js-style move result. `san` carries check ('+') / mate ('#') markers;
// `flags` carries capture ('c'), en-passant ('e'), castle ('k'/'q'), promotion.
interface MoveLike {
  captured?: string;
  flags?: string;
  san?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

// Pick and play the appropriate sound from a move result. Precedence:
// game-end (mate) > check > capture > move. Castling and promotion fall back
// to the capture/move sounds.
export function playMoveSound(move: MoveLike) {
  const san = move.san ?? '';
  const isMate = move.isCheckmate || san.includes('#');
  const isCheck = move.isCheck || san.includes('+');
  const isCapture = !!move.captured || (move.flags?.includes('e') ?? false);

  if (isMate) playSound('gameEnd');
  else if (isCheck) playSound('check');
  else if (isCapture) playSound('capture');
  else playSound('move');
}

// Explicit end-of-game sound (stalemate, draw, resignation, etc.) where there
// isn't a checkmating move to infer it from.
export function playGameEndSound() {
  playSound('gameEnd');
}
