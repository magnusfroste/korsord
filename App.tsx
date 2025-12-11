import React, { useState, useEffect, useCallback } from 'react';
import { generatePuzzle } from './services/geminiService';
import { GameMode, AgeGroup, PuzzleData, UserProgress, DifficultyLevel } from './types';
import { Grid } from './components/Grid';
import { DraggableWord } from './components/DraggableWord';
import { Button } from './components/ui/Button';
import { Trophy, Star, ArrowLeft, Settings, Play, Brain, Sparkles, Zap, Eye, EyeOff, HelpCircle, History, Lightbulb } from 'lucide-react';

// --- Constants ---
const INITIAL_PROGRESS: UserProgress = {
  xp: 0,
  level: 1,
  completedPuzzles: [],
  unlockedAgeGroups: [AgeGroup.SIX],
  coins: 0
};

const SAVED_GAME_KEY = 'korsord_saved_game';
const HINT_COST = 10;

export default function App() {
  // --- Global State ---
  const [view, setView] = useState<'HOME' | 'GAME' | 'WIN'>('HOME');
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('korsord_progress');
    return saved ? JSON.parse(saved) : INITIAL_PROGRESS;
  });

  // --- Game Session State ---
  const [currentAge, setCurrentAge] = useState<AgeGroup>(AgeGroup.SIX);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.EASY);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [showSolvedHighlight, setShowSolvedHighlight] = useState(true);
  
  // State to track if a saved game exists
  const [hasSavedGame, setHasSavedGame] = useState(false);

  // Determine mode based on Age
  const getMode = (age: AgeGroup): GameMode => {
    if (age === AgeGroup.SIX) return GameMode.DRAG_WORDS;
    if (age === AgeGroup.EIGHT) return GameMode.DRAG_LETTERS;
    return GameMode.TYPING;
  };

  const mode = getMode(currentAge);

  // --- Effects ---
  
  // Save Progress (XP, coins)
  useEffect(() => {
    localStorage.setItem('korsord_progress', JSON.stringify(progress));
  }, [progress]);

  // Check for saved game on mount
  useEffect(() => {
    const savedData = localStorage.getItem(SAVED_GAME_KEY);
    if (savedData) {
        setHasSavedGame(true);
    }
  }, []);

  // Auto-save current puzzle state
  useEffect(() => {
    if (view === 'GAME' && puzzle) {
        const gameState = {
            puzzle,
            solvedWords,
            userInputs,
            currentAge,
            difficulty,
            timestamp: Date.now()
        };
        localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(gameState));
        setHasSavedGame(true);
    }
  }, [view, puzzle, solvedWords, userInputs, currentAge, difficulty]);

  // Check win condition
  useEffect(() => {
    if (puzzle && solvedWords.length === puzzle.words.length && view === 'GAME') {
      setTimeout(() => {
        handleWin();
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solvedWords, puzzle]);

  // --- Actions ---

  const startGame = async (age: AgeGroup, theme: string) => {
    // If starting a NEW game, we might be overwriting a saved one. 
    // Ideally we could warn, but for kids simplicity, we just start new.
    setLoading(true);
    setCurrentAge(age);
    try {
      const newPuzzle = await generatePuzzle(age, theme, difficulty);
      setPuzzle(newPuzzle);
      setSolvedWords([]);
      setUserInputs({});
      setActiveWordId(null);
      setView('GAME');
      // Clearing old save happens automatically when the useEffect fires with new puzzle data
    } catch (e) {
      alert("Kunde inte ladda spelet. Försök igen!");
    } finally {
      setLoading(false);
    }
  };

  const resumeGame = () => {
      try {
          const savedData = localStorage.getItem(SAVED_GAME_KEY);
          if (savedData) {
              const parsed = JSON.parse(savedData);
              // Restore all state
              setPuzzle(parsed.puzzle);
              setSolvedWords(parsed.solvedWords);
              setUserInputs(parsed.userInputs);
              setCurrentAge(parsed.currentAge);
              setDifficulty(parsed.difficulty);
              setView('GAME');
          }
      } catch (e) {
          console.error("Failed to resume game", e);
          setHasSavedGame(false);
          localStorage.removeItem(SAVED_GAME_KEY);
      }
  };

  const handleWin = () => {
    setView('WIN');
    
    // Clear saved game on win so they start fresh next time
    localStorage.removeItem(SAVED_GAME_KEY);
    setHasSavedGame(false);

    // XP Multiplier based on difficulty
    let xpGain = 100;
    if (difficulty === DifficultyLevel.MEDIUM) xpGain = 150;
    if (difficulty === DifficultyLevel.HARD) xpGain = 200;

    setProgress(prev => ({
      ...prev,
      xp: prev.xp + xpGain,
      coins: prev.coins + (difficulty === DifficultyLevel.HARD ? 20 : 10),
      completedPuzzles: [...prev.completedPuzzles, puzzle?.title || 'Unknown']
    }));
  };

  const handleCellClick = (r: number, c: number) => {
    // Find word at this cell
    if (!puzzle) return;
    const clickedWord = puzzle.words.find(w => {
        const isHoriz = w.direction === 'across';
        if (isHoriz) return w.row === r && c >= w.col && c < w.col + w.word.length;
        else return w.col === c && r >= w.row && r < w.row + w.word.length;
    });

    if (clickedWord) {
        setActiveWordId(clickedWord.id);
    }
  };

  const handleDropWord = (wordId: string) => {
    if (!solvedWords.includes(wordId)) {
        setSolvedWords(prev => [...prev, wordId]);
        // Also fill in the inputs for visual completeness
        const word = puzzle?.words.find(w => w.id === wordId);
        if (word) {
            const newInputs = { ...userInputs };
            for(let i=0; i<word.word.length; i++) {
                const r = word.direction === 'across' ? word.row : word.row + i;
                const c = word.direction === 'across' ? word.col + i : word.col;
                newInputs[`${r}-${c}`] = word.word[i];
            }
            setUserInputs(newInputs);
        }
    }
  };

  const handleHint = () => {
    if (!activeWordId || !puzzle) return;
    
    // Check if user has enough coins
    if (progress.coins < HINT_COST) {
        alert(`Du behöver ${HINT_COST} mynt för att få en ledtråd! Fortsätt spela för att tjäna fler.`);
        return;
    }

    const word = puzzle.words.find(w => w.id === activeWordId);
    if (!word) return;

    if (mode === GameMode.DRAG_WORDS) {
        // In drag mode, the "Hint" just solves the word completely
        if (!solvedWords.includes(word.id)) {
            handleDropWord(word.id);
            setProgress(prev => ({ ...prev, coins: prev.coins - HINT_COST }));
            setActiveWordId(null);
        }
    } else {
        // In typing mode, find the first missing or incorrect letter
        let targetCoord = null;
        let charToFill = '';

        for (let i = 0; i < word.word.length; i++) {
            const r = word.direction === 'across' ? word.row : word.row + i;
            const c = word.direction === 'across' ? word.col + i : word.col;
            const key = `${r}-${c}`;
            const correctChar = word.word[i];

            if (userInputs[key] !== correctChar) {
                targetCoord = key;
                charToFill = correctChar;
                break;
            }
        }

        if (targetCoord) {
            const newInputs = { ...userInputs, [targetCoord]: charToFill };
            setUserInputs(newInputs);
            setProgress(prev => ({ ...prev, coins: prev.coins - HINT_COST }));

            // Check if word is now complete
            let isWordCorrect = true;
            for(let i=0; i<word.word.length; i++) {
                const r = word.direction === 'across' ? word.row : word.row + i;
                const c = word.direction === 'across' ? word.col + i : word.col;
                const k = `${r}-${c}`;
                if (newInputs[k] !== word.word[i]) {
                    isWordCorrect = false;
                    break;
                }
            }

            if (isWordCorrect) {
                setSolvedWords(prev => [...prev, word.id]);
                setActiveWordId(null);
            }
        }
    }
  };

  const handleVirtualKey = (char: string) => {
      if (!activeWordId || !puzzle) return;
      // Simple logic: find first empty cell in active word
      const word = puzzle.words.find(w => w.id === activeWordId);
      if (!word) return;

      // Check if word is already solved logic could go here, but we allow overwriting for correction
      
      let targetR = -1;
      let targetC = -1;

      // Find first empty or just fill next logical?
      // For simplicity in this demo: we find the first empty spot in the active word.
      for (let i = 0; i < word.word.length; i++) {
          const r = word.direction === 'across' ? word.row : word.row + i;
          const c = word.direction === 'across' ? word.col + i : word.col;
          const key = `${r}-${c}`;
          if (!userInputs[key]) {
              targetR = r;
              targetC = c;
              break;
          }
      }

      // If full, maybe just overwrite the last one or do nothing? 
      // Let's keep it simple: if full, do nothing unless user clicks specific cell (not implemented deeply here)
      if (targetR !== -1) {
          const key = `${targetR}-${targetC}`;
          const newInputs = { ...userInputs, [key]: char };
          setUserInputs(newInputs);

          // Check if word is now complete and correct
          let isWordCorrect = true;
          for(let i=0; i<word.word.length; i++) {
             const r = word.direction === 'across' ? word.row : word.row + i;
             const c = word.direction === 'across' ? word.col + i : word.col;
             const k = `${r}-${c}`;
             if (newInputs[k] !== word.word[i]) {
                 isWordCorrect = false;
                 break;
             }
          }

          if (isWordCorrect) {
              setSolvedWords(prev => [...prev, word.id]);
              setActiveWordId(null); // Deselect
          }
      }
  };

  const getDifficultyDescription = (level: DifficultyLevel) => {
    switch(level) {
      case DifficultyLevel.EASY: return "Perfekt för nybörjare! Färre ord och enklare ledtrådar.";
      case DifficultyLevel.MEDIUM: return "Lite klurigare. Fler ord och korsande bokstäver.";
      case DifficultyLevel.HARD: return "För experter! Stort korsord med utmanande ord.";
      default: return "";
    }
  };

  // --- Render Views ---

  if (view === 'HOME') {
    return (
      <div className="min-h-screen bg-brand-light flex flex-col items-center p-4 overflow-y-auto">
        <header className="w-full max-w-2xl flex justify-between items-center mb-8 bg-white p-4 rounded-3xl shadow-lg">
           <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-accent-yellow rounded-full flex items-center justify-center border-4 border-orange-200">
                   <Brain className="text-orange-600" size={24} />
               </div>
               <div>
                   <h1 className="text-xl font-black text-brand-dark leading-none">Korsords</h1>
                   <span className="text-brand font-bold text-sm">Äventyret</span>
               </div>
           </div>
           <div className="flex items-center gap-4">
               <div className="flex flex-col items-end">
                   <div className="flex items-center gap-1 text-accent-orange font-bold">
                       <Trophy size={16} /> <span>{progress.xp} XP</span>
                   </div>
                   <div className="flex items-center gap-1 text-accent-yellow font-bold text-sm">
                       <Star size={14} fill="currentColor" /> <span>Nivå {progress.level}</span>
                   </div>
                   <div className="flex items-center gap-1 text-yellow-600 font-bold text-sm bg-yellow-100 px-2 rounded-full">
                       <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600" /> 
                       <span>{progress.coins} Mynt</span>
                   </div>
               </div>
           </div>
        </header>

        <div className="w-full max-w-2xl space-y-6">

            {/* Resume Button if game exists */}
            {hasSavedGame && (
                <div className="bg-white p-6 rounded-3xl shadow-md border-l-8 border-accent-green">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-black text-slate-800 text-lg">Fortsätt äventyret!</h3>
                            <p className="text-slate-500 text-sm font-medium">Du har ett påbörjat korsord.</p>
                        </div>
                        <button 
                            onClick={resumeGame}
                            className="flex items-center gap-2 bg-accent-green text-white px-6 py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-transform animate-pulse-fast"
                        >
                            <History size={20} />
                            Fortsätt
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-3xl shadow-md">
                <h3 className="text-center text-slate-500 font-bold uppercase text-xs mb-3 tracking-wider">Välj Svårighetsgrad</h3>
                <div className="flex gap-2 justify-center">
                    {[
                        { level: DifficultyLevel.EASY, label: 'Lätt', color: 'bg-green-100 text-green-700 border-green-200' },
                        { level: DifficultyLevel.MEDIUM, label: 'Medel', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                        { level: DifficultyLevel.HARD, label: 'Svår', color: 'bg-red-100 text-red-700 border-red-200' },
                    ].map((d) => (
                        <button
                            key={d.level}
                            onClick={() => setDifficulty(d.level)}
                            className={`
                                flex-1 py-3 px-4 rounded-xl font-black border-b-4 transition-all
                                ${difficulty === d.level 
                                    ? `${d.color.replace('bg-', 'bg-white ').replace('text-', 'text-slate-800 ')} !bg-slate-800 !text-white !border-slate-900 scale-105 shadow-lg` 
                                    : `${d.color} hover:opacity-80`
                                }
                            `}
                        >
                           {d.label}
                        </button>
                    ))}
                </div>
                <p className="text-center text-slate-400 text-xs font-medium mt-3 animate-pulse-fast">
                    {getDifficultyDescription(difficulty)}
                </p>
            </div>

            <h2 className="text-2xl font-black text-brand-dark text-center mb-4">Välj ditt äventyr!</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { age: AgeGroup.SIX, label: 'Nybörjare', icon: '🐣', color: 'bg-green-400', theme: 'Djur' },
                    { age: AgeGroup.EIGHT, label: 'Upptäckare', icon: '🦁', color: 'bg-blue-400', theme: 'Skolan' },
                    { age: AgeGroup.TEN, label: 'Expert', icon: '🚀', color: 'bg-purple-400', theme: 'Rymden' },
                    { age: AgeGroup.TWELVE, label: 'Mästare', icon: '👑', color: 'bg-red-400', theme: 'Historia' },
                ].map((level) => (
                    <button 
                        key={level.age}
                        onClick={() => startGame(level.age, level.theme)}
                        className={`
                            relative overflow-hidden group
                            ${level.color} p-6 rounded-3xl shadow-[0_6px_0_0_rgba(0,0,0,0.1)] 
                            hover:shadow-none hover:translate-y-[6px] transition-all
                            flex items-center justify-between
                        `}
                    >
                        <div className="text-left text-white z-10">
                            <span className="text-xs font-bold opacity-90 uppercase tracking-wider">{level.age}</span>
                            <h3 className="text-3xl font-black mb-1">{level.label}</h3>
                            <div className="bg-white/20 inline-block px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">
                                Tema: {level.theme}
                            </div>
                        </div>
                        <span className="text-6xl group-hover:scale-125 transition-transform duration-300 transform rotate-12">{level.icon}</span>
                        
                        {/* Interactive particles */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10" />
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8" />
                    </button>
                ))}
            </div>
        </div>
        
        {loading && (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                 <div className="bg-white p-8 rounded-3xl flex flex-col items-center animate-bounce-slow">
                     <Sparkles className="text-accent-yellow w-12 h-12 mb-4 animate-spin" />
                     <p className="text-xl font-bold text-brand-dark">Magin skapas...</p>
                 </div>
             </div>
        )}
      </div>
    );
  }

  if (view === 'WIN') {
      return (
          <div className="min-h-screen bg-accent-yellow flex flex-col items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
              
              <div className="z-10 bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full animate-bounce-slow">
                  <div className="flex justify-center -mt-20 mb-6">
                      <div className="bg-brand text-white p-6 rounded-full shadow-lg border-4 border-white">
                          <Trophy size={64} />
                      </div>
                  </div>
                  <h2 className="text-4xl font-black text-brand-dark mb-2">GRATTIS!</h2>
                  <p className="text-slate-500 font-bold text-lg mb-8">Du klarade {puzzle?.title}!</p>
                  
                  <div className="flex justify-center gap-8 mb-8">
                      <div className="text-center">
                          <span className="block text-3xl font-black text-accent-orange">
                              +{difficulty === DifficultyLevel.HARD ? 200 : difficulty === DifficultyLevel.MEDIUM ? 150 : 100}
                          </span>
                          <span className="text-xs uppercase font-bold text-slate-400">XP</span>
                      </div>
                      <div className="text-center">
                          <span className="block text-3xl font-black text-accent-yellow">
                              +{difficulty === DifficultyLevel.HARD ? 20 : 10}
                          </span>
                          <span className="text-xs uppercase font-bold text-slate-400">Mynt</span>
                      </div>
                  </div>

                  <Button variant="primary" size="lg" className="w-full" onClick={() => setView('HOME')}>
                      Tillbaka till kartan
                  </Button>
              </div>
          </div>
      )
  }

  // --- GAME VIEW ---

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col h-screen">
      {/* Top Bar */}
      <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center shrink-0 relative">
         <button onClick={() => setView('HOME')} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 z-20">
             <ArrowLeft className="text-slate-600" />
         </button>
         
         {/* Centered Title */}
         <div className="text-center absolute left-0 right-0 pointer-events-none">
             <div className="inline-block pointer-events-auto">
                 <h2 className="font-black text-brand-dark text-lg uppercase tracking-widest leading-none">{puzzle?.title}</h2>
                 <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                     {difficulty}
                 </span>
             </div>
         </div>
         
         {/* Right Side Controls */}
         <div className="z-20 flex items-center gap-2">
             <div className="hidden md:flex items-center gap-1 text-yellow-600 font-bold text-xs bg-yellow-100 px-2 py-1 rounded-full mr-2 pointer-events-none">
                 <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600" /> 
                 <span>{progress.coins}</span>
             </div>

             <button
                onClick={handleHint}
                disabled={!activeWordId || progress.coins < HINT_COST || (solvedWords.includes(activeWordId || ''))}
                className={`
                    p-2 rounded-full transition-all border-2 shadow-sm flex items-center gap-1
                    ${!activeWordId || (solvedWords.includes(activeWordId || '')) 
                        ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed' 
                        : 'bg-yellow-50 border-yellow-300 text-yellow-600 hover:bg-yellow-100'
                    }
                `}
                title={`Köp ledtråd (${HINT_COST} mynt)`}
             >
                 <Lightbulb size={20} className={activeWordId && !solvedWords.includes(activeWordId) ? "fill-current" : ""} />
                 <span className="text-xs font-bold hidden sm:inline">-{HINT_COST}</span>
             </button>

             <button
               onClick={() => setShowSolvedHighlight(!showSolvedHighlight)}
               className={`p-2 rounded-full transition-colors border-2 shadow-sm ${showSolvedHighlight ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-400'}`}
               title={showSolvedHighlight ? "Dölj markering" : "Visa markering"}
            >
                {showSolvedHighlight ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
         </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-6xl mx-auto w-full">
         
         {/* Left Side: Clue/Interaction */}
         <div className="md:w-1/3 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 bg-slate-50 border-r border-slate-200">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-400 text-xs uppercase mb-2">Uppdrag</h3>
                <p className="text-brand-dark font-medium leading-relaxed">
                    {mode === GameMode.DRAG_WORDS 
                        ? "Dra bilderna till rätt plats i rutnätet!" 
                        : "Klicka på en rad och skriv ordet!"}
                </p>
            </div>

            {activeWordId && (
                <div className="bg-accent-yellow/20 border-2 border-accent-yellow p-4 rounded-2xl animate-pulse-fast transition-all">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-accent-orange font-black text-sm uppercase">Ledtråd</span>
                        <div className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-full shadow-sm">
                            <HelpCircle size={10} className="text-slate-500"/>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                {mode === GameMode.DRAG_WORDS ? "Dra rätt bild hit" : "Skriv ordet här"}
                            </span>
                        </div>
                     </div>
                     <p className="font-bold text-xl text-slate-800 leading-tight mb-2">
                         {puzzle?.words.find(w => w.id === activeWordId)?.clue}
                     </p>
                     {/* Show image hint for typing modes too if needed */}
                     {mode !== GameMode.DRAG_WORDS && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-200 border-2 border-white shadow-sm">
                             <img 
                                src={`https://image.pollinations.ai/prompt/${puzzle?.words.find(w => w.id === activeWordId)?.imageKeyword}?width=100&height=100&nologo=true`} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                     )}
                </div>
            )}

            {/* Word Bank for Drag Mode */}
            {mode === GameMode.DRAG_WORDS && puzzle && (
                <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-20">
                    {puzzle.words.map(w => (
                        <DraggableWord 
                            key={w.id} 
                            wordData={w} 
                            isSolved={solvedWords.includes(w.id)} 
                        />
                    ))}
                </div>
            )}
         </div>

         {/* Center: Grid */}
         <div className="flex-1 p-4 flex flex-col items-center justify-center bg-slate-100 relative overflow-y-auto">
             {puzzle && (
                 <Grid 
                    puzzle={puzzle}
                    inputs={userInputs}
                    mode={mode}
                    solvedWords={solvedWords}
                    activeWordId={activeWordId}
                    onCellClick={handleCellClick}
                    onDropWord={handleDropWord}
                    showSolvedHighlight={showSolvedHighlight}
                 />
             )}
         </div>

      </div>

      {/* Bottom: Virtual Keyboard (for typing modes) */}
      {mode !== GameMode.DRAG_WORDS && (
          <div className="bg-white p-2 pb-6 border-t border-slate-200 shrink-0">
              <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-1">
                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split('').map(char => (
                      <button
                        key={char}
                        onClick={() => handleVirtualKey(char)}
                        className="w-8 h-10 sm:w-10 sm:h-12 bg-slate-100 rounded shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] font-bold text-slate-700 hover:bg-brand hover:text-white transition-colors text-lg"
                      >
                          {char}
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}