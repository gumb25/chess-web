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

export type Tab = 'home' | 'puzzle' | 'play' | 'analyze' | 'stats' | 'settings';

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
}

export const DEFAULT_SETTINGS: AppSettings = {
  boardTheme: 'classic',
  puzzleThemes: [],
  minRating: 800,
  maxRating: 2400,
  engineSkill: 10,
};

export const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string }> = {
  classic:      { light: '#f0d9b5', dark: '#b58863' },
  professional: { light: '#dee3e6', dark: '#8ca2ad' },
  minimal:      { light: '#eeeed2', dark: '#769656' },
};

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
