export enum GameMode {
  DRAG_WORDS = 'DRAG_WORDS',     // Age 6-8: Drag full words to images/slots
  DRAG_LETTERS = 'DRAG_LETTERS', // Age 8-10: Drag letters to slots
  TYPING = 'TYPING',             // Age 10+: Classic crossword typing
}

export enum AgeGroup {
  SIX = '6-8 år',
  EIGHT = '8-10 år',
  TEN = '10-12 år',
  TWELVE = '12+ år',
}

export enum DifficultyLevel {
  EASY = 'Lätt',
  MEDIUM = 'Medel',
  HARD = 'Svår',
}

export interface WordPosition {
  id: string;
  word: string;
  clue: string;
  imageKeyword: string; // Used to generate the image URL
  row: number; // 0-indexed
  col: number; // 0-indexed
  direction: 'across' | 'down';
}

export interface PuzzleData {
  title: string;
  theme: string;
  width: number;
  height: number;
  words: WordPosition[];
}

export interface UserProgress {
  xp: number;
  level: number; // Current level number
  completedPuzzles: string[]; // IDs of completed puzzles
  unlockedAgeGroups: AgeGroup[];
  coins: number;
}

export interface GameState {
  currentPuzzle: PuzzleData | null;
  loading: boolean;
  error: string | null;
  solvedWords: string[]; // IDs of solved words
  userInputs: Record<string, string>; // cellKey (r-c) -> letter
}