export interface WordStats {
  reviews: number;
  correctCount: number;
  incorrectCount: number;
  masteryScore: number; // 0 to 100
  lastReviewed: number; // timestamp
}

export interface GREWordData {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  greContext: {
    explanation: string;
    sentenceEn: string;
    sentenceCn: string;
  };
  etymology: {
    origin: string;
    structure: string;
    logic: string;
  };
  mnemonic: string;
  cognates: Array<{
    word: string;
    pos: string;
    meaning: string;
  }>;
  synonyms: Array<{
    word: string;
    meaning: string;
  }>;
  antonyms: Array<{
    word: string;
    meaning: string;
  }>;
  timestamp?: number;
  stats?: WordStats;
  // Typo correction fields
  wasCorrected?: boolean;
  originalQuery?: string;
}

export interface Settings {
  darkMode: boolean;
  serifFont: boolean;
  fontSize: 'small' | 'medium' | 'large';
  // Quiz Settings
  quizSource: 'ALL' | 'FAVORITES';
  quizMode: 'RANDOM' | 'WEAKEST';
  quizQuestionCount: number;
  // Learning Goals
  learningGoal: number;
}

export enum ViewMode {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  WORD_BOOK = 'WORD_BOOK',
  FLASHCARDS = 'FLASHCARDS',
  QUIZ = 'QUIZ',
  ANALYZER = 'ANALYZER'
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface StudyStats {
  streakDays: number;
  lastStudyDate: string; // ISO Date YYYY-MM-DD
}

export interface UserData {
  favorites: GREWordData[];
  history: string[];
  settings: Settings;
  wordCache: Record<string, GREWordData>;
  studyStats: StudyStats;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  wordData: GREWordData;
}

export interface AnalyzedWord {
  word: string;
  definition: string;
}