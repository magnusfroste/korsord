import type { AgeGroup, DifficultyLevel, PuzzleData } from "../types";
import { buildPuzzle } from "../lib/crossword";
import { THEME_NAMES } from "../data/wordBank";

/** Antal ord i rutnätet utifrån ålder och svårighetsgrad. */
const wordCountFor = (age: AgeGroup, difficulty: DifficultyLevel): number => {
  const base =
    age === "6-8 år" ? 4 : age === "8-10 år" ? 6 : age === "10-12 år" ? 8 : 10;
  const bump = difficulty === "Lätt" ? -1 : difficulty === "Svår" ? 2 : 0;
  return Math.max(3, base + bump);
};

export const pickTheme = (requested?: string): string => {
  if (requested && THEME_NAMES.includes(requested)) return requested;
  return THEME_NAMES[Math.floor(Math.random() * THEME_NAMES.length)];
};

/**
 * Korsorden byggs lokalt i webbläsaren – ingen AI, ingen nyckel, inga nätanrop.
 */
export const generatePuzzle = async (
  age: AgeGroup,
  theme: string,
  difficulty: DifficultyLevel,
): Promise<PuzzleData> => buildPuzzle(pickTheme(theme), wordCountFor(age, difficulty));

export const themeNames = THEME_NAMES;