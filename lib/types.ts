export type PieceColor = 'w' | 'b';
export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

export type BoardTheme = 'classic' | 'professional' | 'minimal';

export type Tab = 'home' | 'puzzle' | 'play' | 'analyze' | 'openings' | 'progress' | 'settings';

export type Appearance = 'system' | 'light' | 'dark';

export interface PuzzleResult {
  puzzleId: string;
  solved: boolean;
  usedHint: boolean;
}

export interface DayStats {
  date: string;
  correct: number;
  incorrect: number;
  played: number;
}

export interface AppSettings {
  boardTheme: BoardTheme;
  puzzleThemes: string[];
  minRating: number;
  maxRating: number;
  engineSkill: number;
  appearance: Appearance;
}

export const DEFAULT_SETTINGS: AppSettings = {
  boardTheme: 'classic',
  puzzleThemes: [],
  minRating: 800,
  maxRating: 2400,
  engineSkill: 10,
  appearance: 'system',
};

export const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; label: string }> = {
  classic:      { light: '#ecd8b6', dark: '#b3865f', label: 'Walnut' },
  professional: { light: '#dfe4e8', dark: '#8a9fb0', label: 'Slate' },
  minimal:      { light: '#ebecd0', dark: '#739552', label: 'Tournament' },
};

// Readable labels for Lichess puzzle theme ids ("backRankMate" → "Back rank mate").
export function themeLabel(id: string): string {
  const special: Record<string, string> = {
    mateIn1: 'Mate in 1', mateIn2: 'Mate in 2', mateIn3: 'Mate in 3', mateIn4: 'Mate in 4', mateIn5: 'Mate in 5',
    attackingF2F7: 'Attacking f2/f7', superGM: 'Super GM', xRayAttack: 'X-ray attack', enPassant: 'En passant',
  };
  if (special[id]) return special[id];
  const words = id.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function skillLabel(skill: number): string {
  return skill <= 3 ? 'Beginner' : skill <= 6 ? 'Casual' : skill <= 10 ? 'Club player' : skill <= 14 ? 'Advanced' : skill <= 18 ? 'Expert' : 'Maximum';
}

export const ALL_PUZZLE_THEMES = [
  'advancedPawn', 'advantage', 'anastasiaMate', 'arabianMate', 'attackingF2F7',
  'attraction', 'backRankMate', 'bishopEndgame', 'bodenMate', 'capturingDefender',
  'castling', 'clearance', 'coercion', 'crushing', 'defensiveMove',
  'deflection', 'discoveredAttack', 'doubleBishopMate', 'doubleCheck', 'dovetailMate',
  'endgame', 'enPassant', 'equality', 'exposedKing', 'fork',
  'hangingPiece', 'hookMate', 'interference', 'intermezzo', 'kingsideAttack',
  'knightEndgame', 'long', 'masterVsMaster', 'mateIn1', 'mateIn2',
  'mateIn3', 'mateIn4', 'mateIn5', 'middlegame', 'opening',
  'pawnEndgame', 'pin', 'promotion', 'queenEndgame', 'queenRookEndgame',
  'queensideAttack', 'quietMove', 'rookEndgame', 'sacrifice', 'short',
  'skewer', 'smotheredMate', 'superGM', 'trappedPiece', 'underPromotion',
  'veryLong', 'xRayAttack', 'zugzwang',
];
