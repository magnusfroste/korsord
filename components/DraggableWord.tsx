import React from 'react';
import { WordPosition } from '../types';

interface DraggableWordProps {
  wordData: WordPosition;
  isSolved: boolean;
}

export const DraggableWord: React.FC<DraggableWordProps> = ({ wordData, isSolved }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", wordData.id);
    e.dataTransfer.effectAllowed = "move";
  };

  if (isSolved) return null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="
        bg-white border-b-4 border-slate-200 rounded-xl p-2 m-2 cursor-grab active:cursor-grabbing
        flex flex-col items-center gap-2 w-32 shrink-0 shadow-md hover:scale-105 transition-transform
      "
    >
      <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden relative flex items-center justify-center">
        <span className="text-6xl leading-none select-none" aria-hidden="true">
          {wordData.emoji || '🧩'}
        </span>
      </div>
      <span className="font-black text-xl text-slate-700 uppercase tracking-widest">{wordData.word}</span>
    </div>
  );
};
