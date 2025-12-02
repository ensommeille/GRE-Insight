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
}

export interface Settings {
  darkMode: boolean;
  serifFont: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export enum ViewMode {
  SEARCH = 'SEARCH',
  WORD_BOOK = 'WORD_BOOK',
  FLASHCARDS = 'FLASHCARDS',
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface UserData {
  favorites: GREWordData[];
  history: string[];
  settings: Settings;
  wordCache: Record<string, GREWordData>;
}