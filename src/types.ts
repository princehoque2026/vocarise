export interface Word {
  word: string;
  level: 'B2' | 'C1' | 'C2';
  meaning_bn: string;
  sentence: string;
  explanation: string;
}

export interface UserStats {
  streak: number;
  lastActiveDate: string | null;
  learnedWords: string[]; // word strings
  weakWords: string[]; // word strings
  levelStats: {
    B2: number;
    C1: number;
    C2: number;
  };
}

export interface DailyWords {
  date: string;
  words: Word[];
}
