import { GoogleGenAI, Type, SchemaParams } from "@google/genai";
import { AgeGroup, DifficultyLevel, PuzzleData, WordPosition } from "../types";

// Helper to get cached key or null. 
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

const wordSchema: SchemaParams = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    word: { type: Type.STRING, description: "The word in Swedish, uppercase." },
    clue: { type: Type.STRING, description: "A clue appropriate for the age group in Swedish." },
    imageKeyword: { type: Type.STRING, description: "A single English keyword to search for an image representing the word." },
    row: { type: Type.INTEGER, description: "Grid row starting at 0." },
    col: { type: Type.INTEGER, description: "Grid column starting at 0." },
    direction: { type: Type.STRING, enum: ["across", "down"] },
  },
  required: ["id", "word", "clue", "imageKeyword", "row", "col", "direction"],
};

const puzzleSchema: SchemaParams = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    theme: { type: Type.STRING },
    width: { type: Type.INTEGER, description: "Grid width (max 10 for kids)." },
    height: { type: Type.INTEGER, description: "Grid height (max 10 for kids)." },
    words: {
      type: Type.ARRAY,
      items: wordSchema,
    },
  },
  required: ["title", "theme", "width", "height", "words"],
};

export const generatePuzzle = async (age: AgeGroup, theme: string, difficulty: DifficultyLevel): Promise<PuzzleData> => {
  if (!API_KEY) {
    throw new Error("API Key saknas. Vänligen konfigurera din miljö.");
  }

  const ageNum = parseInt(age.split('-')[0]);
  
  // Configure parameters based on Age AND Difficulty
  let wordCountTarget = "3-5";
  let gridSizeTarget = "6x6";
  let complexityDesc = "Simple nouns.";
  let imageStyle = "Clear and concrete objects.";

  // Base Logic per Age
  if (ageNum < 8) {
    // 6-8 Years
    if (difficulty === DifficultyLevel.EASY) {
      wordCountTarget = "3 words";
      gridSizeTarget = "5x5";
      complexityDesc = "Very simple nouns (3-4 letters). No intersections required.";
      imageStyle = "Highly concrete, isolated objects (e.g. 'cat', 'sun').";
    } else if (difficulty === DifficultyLevel.MEDIUM) {
      wordCountTarget = "4 words";
      gridSizeTarget = "6x6";
      complexityDesc = "Simple nouns. At least 1 intersection.";
      imageStyle = "Common objects and animals, easy to identify.";
    } else { // HARD
      wordCountTarget = "5-6 words";
      gridSizeTarget = "7x7";
      complexityDesc = "Simple nouns. Multiple intersections.";
      imageStyle = "Common objects, but maybe slightly more detailed.";
    }
  } else if (ageNum < 10) {
    // 8-10 Years
    if (difficulty === DifficultyLevel.EASY) {
      wordCountTarget = "5 words";
      gridSizeTarget = "7x7";
      complexityDesc = "Common nouns/verbs. Simple intersections.";
      imageStyle = "Clear representations of nouns or simple verbs.";
    } else if (difficulty === DifficultyLevel.MEDIUM) {
      wordCountTarget = "6-7 words";
      gridSizeTarget = "8x8";
      complexityDesc = "Standard words. Good intersections.";
      imageStyle = "Varied vocabulary.";
    } else { // HARD
      wordCountTarget = "8-9 words";
      gridSizeTarget = "9x9";
      complexityDesc = "Varied vocabulary. Dense intersections.";
      imageStyle = "Can be slightly abstract or require inference.";
    }
  } else {
    // 10+ Years
    if (difficulty === DifficultyLevel.EASY) {
      wordCountTarget = "6-7 words";
      gridSizeTarget = "8x8";
      complexityDesc = "Standard crossword style.";
    } else if (difficulty === DifficultyLevel.MEDIUM) {
      wordCountTarget = "8-10 words";
      gridSizeTarget = "10x10";
      complexityDesc = "Standard crossword style with some longer words.";
    } else { // HARD
      wordCountTarget = "10-15 words";
      gridSizeTarget = "10x10 or 12x12";
      complexityDesc = "Challenging words, perhaps some abstract concepts. Dense grid.";
    }
  }

  const prompt = `
    Skapa ett korsord på svenska för barn i åldern ${age}.
    Svårighetsgrad: ${difficulty}.
    Tema: ${theme}.
    
    Instruktioner för struktur:
    - Antal ord: Cirka ${wordCountTarget}.
    - Rutnätets maxstorlek: ${gridSizeTarget}.
    - Komplexitet: ${complexityDesc}
    - Bildstil för keywords (viktigt för bildgenerering): ${imageStyle}
    
    Viktigt:
    - Se till att orden faktiskt får plats och korsar varandra korrekt (om korsningar krävs).
    - Returnera svaret som JSON enligt schemat.
    - Orden måste vara SVENSKA.
    - imageKeyword måste vara ENGELSKA (för bildsök).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: puzzleSchema,
        temperature: 0.7, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("Inget svar från AI.");

    const data = JSON.parse(text) as PuzzleData;
    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback puzzle
    return {
      title: "Djurvänner (Offline)",
      theme: "Djur",
      width: 6,
      height: 6,
      words: [
        { id: "1", word: "KATT", clue: "Säger mjau", imageKeyword: "cat", row: 0, col: 0, direction: "across" },
        { id: "2", word: "HUND", clue: "Människans bästa vän", imageKeyword: "dog", row: 2, col: 0, direction: "across" },
        { id: "3", word: "KO", clue: "Ger oss mjölk", imageKeyword: "cow", row: 4, col: 0, direction: "across" }
      ]
    };
  }
};