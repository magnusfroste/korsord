import type { PuzzleData, WordPosition } from '../types';
import { THEMES, type BankWord } from '../data/wordBank';

interface Slot {
  word: string;
  clue: string;
  emoji: string;
  row: number;
  col: number;
  dir: 'across' | 'down';
}

const key = (r: number, c: number) => r + ',' + c;

class Board {
  letters = new Map<string, string>();
  slots: Slot[] = [];

  fits(word: string, row: number, col: number, dir: 'across' | 'down') {
    let crossings = 0;
    for (let i = 0; i < word.length; i += 1) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      const here = this.letters.get(key(r, c));
      if (here) {
        if (here !== word[i]) return -1;
        crossings += 1;
        continue;
      }
      // Rutorna före och efter ordet måste vara tomma – men bara i ordets ändar.
      if (i === 0) {
        const beforeR = dir === 'across' ? r : r - 1;
        const beforeC = dir === 'across' ? c - 1 : c;
        if (this.letters.has(key(beforeR, beforeC))) return -1;
      }
      if (i === word.length - 1) {
        const afterR = dir === 'across' ? r : r + 1;
        const afterC = dir === 'across' ? c + 1 : c;
        if (this.letters.has(key(afterR, afterC))) return -1;
      }
      // Sidorna måste vara tomma, annars bildas oavsiktliga ord.
      if (dir === 'across') {
        if (this.letters.has(key(r - 1, c)) || this.letters.has(key(r + 1, c))) return -1;
      } else if (this.letters.has(key(r, c - 1)) || this.letters.has(key(r, c + 1))) {
        return -1;
      }
    }
    return crossings;
  }

  place(word: string, clue: string, emoji: string, row: number, col: number, dir: 'across' | 'down') {
    for (let i = 0; i < word.length; i += 1) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      this.letters.set(key(r, c), word[i]);
    }
    this.slots.push({ word, clue, emoji, row, col, dir });
  }
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Lägger orden i ett rutnät med korsningar – helt lokalt. */
function layout(entries: BankWord[], maxWords: number): Board {
  const board = new Board();
  const chosen = [...entries].sort((a, b) => b.word.length - a.word.length).slice(0, maxWords);

  const first = chosen.shift();
  if (!first) return board;
  board.place(first.word, first.clue, first.emoji, 0, 0, 'across');

  for (const entry of chosen) {
    let best: { row: number; col: number; dir: 'across' | 'down'; crossings: number } | null = null;

    for (const slot of board.slots) {
      const dir: 'across' | 'down' = slot.dir === 'across' ? 'down' : 'across';
      for (let i = 0; i < slot.word.length; i += 1) {
        const anchorRow = slot.dir === 'across' ? slot.row : slot.row + i;
        const anchorCol = slot.dir === 'across' ? slot.col + i : slot.col;
        const ch = slot.word[i];
        for (let j = 0; j < entry.word.length; j += 1) {
          if (entry.word[j] !== ch) continue;
          const row = dir === 'across' ? anchorRow : anchorRow - j;
          const col = dir === 'across' ? anchorCol - j : anchorCol;
          const crossings = board.fits(entry.word, row, col, dir);
          if (crossings > 0 && (!best || crossings > best.crossings)) best = { row, col, dir, crossings };
        }
      }
    }

    if (best) board.place(entry.word, entry.clue, entry.emoji, best.row, best.col, best.dir);
  }
  return board;
}

export interface LocalPuzzle extends PuzzleData {
  words: (WordPosition & { emoji: string })[];
}

/** Bygger ett färdigt korsord lokalt, utan AI och utan nätverk. */
export function buildPuzzle(theme: string, wordCount: number): LocalPuzzle {
  const bank = THEMES[theme] ?? THEMES.Djur;
  const wanted = Math.max(3, wordCount);

  // Prova flera blandningar och behåll den som får med flest ord.
  let board = layout(shuffle(bank) as BankWord[], wanted);
  for (let attempt = 0; attempt < 40 && board.slots.length < wanted; attempt += 1) {
    const candidate = layout(shuffle(bank) as BankWord[], wanted);
    if (candidate.slots.length > board.slots.length) board = candidate;
    if (board.slots.length >= Math.min(wanted, wanted)) break;
  }
  return toPuzzle(board, theme);
}

function toPuzzle(board: Board, theme: string): LocalPuzzle {

  // Flytta rutnätet så att det börjar på 0,0.
  const minRow = Math.min(...board.slots.map((s) => s.row));
  const minCol = Math.min(...board.slots.map((s) => s.col));
  const shiftRow = Math.min(0, minRow);
  const shiftCol = Math.min(0, minCol);

  const words: (WordPosition & { emoji: string })[] = board.slots.map((slot, i) => ({
    id: String(i + 1),
    word: slot.word,
    clue: slot.clue,
    emoji: slot.emoji,
    imageKeyword: '',
    row: slot.row - shiftRow,
    col: slot.col - shiftCol,
    direction: slot.dir,
  }));

  const height = Math.max(...words.map((w) => (w.direction === 'down' ? w.row + w.word.length : w.row + 1)));
  const width = Math.max(...words.map((w) => (w.direction === 'across' ? w.col + w.word.length : w.col + 1)));

  return {
    title: theme,
    theme,
    width,
    height,
    words,
  };
}