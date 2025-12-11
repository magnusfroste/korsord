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
      <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden relative">
        <img 
            src={`https://image.pollinations.ai/prompt/${wordData.imageKeyword}?width=200&height=200&nologo=true&seed=${wordData.id}`} 
            alt={wordData.word}
            className="w-full h-full object-cover"
            loading="lazy"
        />
      </div>
      <span className="font-black text-xl text-slate-700 uppercase tracking-widest">{wordData.word}</span>
    </div>
  );
};
