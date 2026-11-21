import React from 'react';
import { WordPosition } from '../types';

interface DraggableWordProps {
  wordData: WordPosition;
  isSolved: boolean;
  /** Tryck (utan att dra) valjer bilden - fungerar pa iPad dar HTML5-drag inte finns. */
  onSelect?: (wordId: string) => void;
  selected?: boolean;
}

export const DraggableWord: React.FC<DraggableWordProps> = ({ wordData, isSolved, onSelect, selected }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", wordData.id);
    e.dataTransfer.effectAllowed = "move";
  };

  if (isSolved) return null;

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect?.(wordData.id)}
      aria-pressed={!!selected}
      className={`
        bg-white border-b-4 rounded-xl p-2 m-2 cursor-pointer select-none
        flex flex-col items-center gap-2 w-32 shrink-0 shadow-md transition-transform
        active:scale-95
        ${selected ? 'border-amber-400 ring-4 ring-amber-300 scale-105' : 'border-slate-200 hover:scale-105'}
      `}
    >
      <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden relative flex items-center justify-center">
        <span className="text-6xl leading-none select-none" aria-hidden="true">
          {wordData.emoji || '🧩'}
        </span>
      </div>
      <span className="font-black text-xl text-slate-700 uppercase tracking-widest">{wordData.word}</span>
    </button>
  );
};
