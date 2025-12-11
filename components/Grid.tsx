import React, { useMemo } from 'react';
import { GameMode, PuzzleData, WordPosition } from '../types';

interface GridProps {
  puzzle: PuzzleData;
  inputs: Record<string, string>;
  mode: GameMode;
  solvedWords: string[];
  activeWordId: string | null;
  onCellClick: (row: number, col: number) => void;
  onDropWord: (wordId: string) => void; // For Drag Words mode
  showSolvedHighlight: boolean;
}

export const Grid: React.FC<GridProps> = ({ 
  puzzle, 
  inputs, 
  mode, 
  solvedWords, 
  activeWordId, 
  onCellClick,
  onDropWord,
  showSolvedHighlight
}) => {
  // Create a 2D map of the grid to easily find what letter belongs where
  const gridMap = useMemo(() => {
    const map = new Map<string, { char: string, wordIds: string[], isStart?: boolean, wordObj?: WordPosition }>();
    
    puzzle.words.forEach(word => {
      for (let i = 0; i < word.word.length; i++) {
        const r = word.direction === 'across' ? word.row : word.row + i;
        const c = word.direction === 'across' ? word.col + i : word.col;
        const key = `${r}-${c}`;
        
        const existing = map.get(key);
        const wordIds = existing ? [...existing.wordIds, word.id] : [word.id];
        
        map.set(key, { 
          char: word.word[i], 
          wordIds, 
          isStart: i === 0 || existing?.isStart,
          wordObj: word
        });
      }
    });
    return map;
  }, [puzzle]);

  // Handle Drag Over for Word Mode
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, wordId: string | undefined) => {
    e.preventDefault();
    if (!wordId) return;
    const droppedWordId = e.dataTransfer.getData("text/plain");
    // In Word Drag mode, we check if the dropped word matches the slot's word ID
    if (droppedWordId === wordId) {
      onDropWord(wordId);
    }
  };

  const renderCell = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const cellData = gridMap.get(key);

    if (!cellData) {
      return <div key={key} className="w-full h-full bg-transparent" />; // Empty spacer
    }

    // Check if the current cell belongs to the active word
    // AND the active word is NOT yet solved.
    const isActiveWordSolved = activeWordId && solvedWords.includes(activeWordId);
    const isActive = activeWordId && cellData.wordIds.includes(activeWordId) && !isActiveWordSolved;

    // Check if ANY word crossing this cell is solved. 
    // If so, the cell is effectively solved/confirmed.
    const isAnyWordSolved = cellData.wordIds.some(id => solvedWords.includes(id));

    const userInput = inputs[key] || '';
    
    // Logic for displaying content based on mode
    let content = '';
    
    // In Drag Words, show empty unless solved. If solved, show full letter.
    if (mode === GameMode.DRAG_WORDS) {
      if (isAnyWordSolved) {
        content = cellData.char;
      }
    } else {
      // In Typing/Letter Drag
      content = userInput;
      if (isAnyWordSolved) content = cellData.char; // Force correct char if word is solved
    }

    // Check for error (Only in typing/letter modes, if input exists, doesn't match, and isn't already solved)
    const isError = mode !== GameMode.DRAG_WORDS && 
                    userInput && 
                    userInput !== cellData.char && 
                    !isAnyWordSolved;

    // Determine cell styling
    let cellStyleClass = "bg-white border-2 border-slate-300 shadow-sm z-0";
    let textColorClass = "text-slate-700";
    let animationStyle = {};

    if (isError) {
        // Error state: Red, shake animation
        cellStyleClass = "bg-red-50 border-red-400 animate-shake z-20";
        textColorClass = "text-red-500";
    } else if (isActive) {
        // High priority: Active editing
        // Distinct background color and thicker border
        cellStyleClass = "bg-brand-light border-4 border-brand shadow-lg scale-105 z-10 transition-transform duration-200";
        textColorClass = "text-brand-dark";
    } else if (isAnyWordSolved && showSolvedHighlight) {
        // Solved state (or partially solved via intersection)
        // We use a custom animation class defined in the style tag below.
        
        // Find which word triggered the "solved" state to calculate the delay sequence.
        // We prioritize the most recently solved word if possible, but finding *any* solved word works.
        const solvedWordId = cellData.wordIds.find(id => solvedWords.includes(id));
        let index = 0;
        if (solvedWordId) {
            const w = puzzle.words.find(word => word.id === solvedWordId);
            if (w) {
                index = w.direction === 'across' ? c - w.col : r - w.row;
            }
        }
        
        // Base delay helps separate the "action" from the "reward" slightly
        const baseDelay = 50; 
        const stagger = 120; // ms per letter

        cellStyleClass = "animate-reveal z-0 border-green-400"; 
        // Note: background color is handled by the keyframe to transition smoothly
        
        textColorClass = "text-green-900"; // Darker green for contrast against the calm green bg
        animationStyle = { animationDelay: `${baseDelay + (index * stagger)}ms` };
    }
    
    // For Drag Words: The "Drop Zone" logic
    const isDragTarget = mode === GameMode.DRAG_WORDS && !isAnyWordSolved && cellData.wordObj?.id;

    return (
      <div
        key={key}
        className={`
          relative w-full h-full aspect-square flex items-center justify-center 
          text-xl md:text-3xl font-bold uppercase rounded-md
          ${cellStyleClass}
          cursor-pointer
        `}
        style={animationStyle}
        onClick={() => onCellClick(r, c)}
        onDragOver={isDragTarget ? handleDragOver : undefined}
        onDrop={isDragTarget ? (e) => handleDrop(e, cellData.wordObj?.id) : undefined}
      >
        {/* Number for crossword start */}
        {cellData.isStart && (
          <span className="absolute top-0.5 left-1 text-[8px] md:text-[10px] text-slate-500 font-sans opacity-70">
           {/* Future: Word Number */}
          </span>
        )}

        {/* The Letter */}
        <span className={`${textColorClass} drop-shadow-sm select-none transition-colors duration-500`}>
          {content}
        </span>
      </div>
    );
  };

  // Generate grid style
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${puzzle.height}, minmax(0, 1fr))`,
    gap: '0.35rem',
    padding: '0.5rem'
  };

  return (
    <>
      <style>{`
        @keyframes smooth-reveal {
          0% { 
            opacity: 0; 
            transform: scale(0.5) translateY(5px); 
            background-color: #ffffff; 
            border-color: #cbd5e1; /* slate-300 */
          }
          50% { 
            opacity: 1; 
            transform: scale(1.15); 
            background-color: #ffffff;
            border-color: #86efac; /* green-300 */
          }
          100% { 
            opacity: 1; 
            transform: scale(1); 
            background-color: #bbf7d0; /* green-200 (Calming green) */
            border-color: #4ade80; /* green-400 */
          }
        }
        .animate-reveal {
          animation: smooth-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          /* Ensure the final state persists */
          background-color: #bbf7d0; 
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
      <div 
        className="w-full max-w-lg mx-auto bg-slate-200 rounded-xl shadow-inner overflow-hidden select-none"
        style={gridStyle}
      >
        {Array.from({ length: puzzle.height }).map((_, r) =>
          Array.from({ length: puzzle.width }).map((_, c) => renderCell(r, c))
        )}
      </div>
    </>
  );
};