import { Word, UserStats, DailyWords } from '../types';

const STORAGE_KEYS = {
  WORDS_BY_DATE: 'vocarise_words_by_date',
  STATS: 'vocarise_stats',
};

export const getStats = (): UserStats => {
  const saved = localStorage.getItem(STORAGE_KEYS.STATS);
  if (saved) return JSON.parse(saved);
  return {
    streak: 0,
    lastActiveDate: null,
    learnedWords: [],
    weakWords: [],
    levelStats: { B2: 0, C1: 0, C2: 0 },
  };
};

export const saveStats = (stats: UserStats) => {
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
};

export const getDailyWords = (date: string): Word[] | null => {
  const saved = localStorage.getItem(STORAGE_KEYS.WORDS_BY_DATE);
  if (saved) {
    const data: DailyWords[] = JSON.parse(saved);
    const entry = data.find((d) => d.date === date);
    return entry ? entry.words : null;
  }
  return null;
};

export const saveDailyWords = (date: string, words: Word[]) => {
  const saved = localStorage.getItem(STORAGE_KEYS.WORDS_BY_DATE);
  let data: DailyWords[] = saved ? JSON.parse(saved) : [];
  data = data.filter(d => d.date !== date); // Avoid duplicates
  data.push({ date, words });
  localStorage.setItem(STORAGE_KEYS.WORDS_BY_DATE, JSON.stringify(data));
};

export const updateStreak = () => {
  const stats = getStats();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (stats.lastActiveDate === today) return;

  if (stats.lastActiveDate === yesterdayStr) {
    stats.streak += 1;
  } else if (stats.lastActiveDate === null || stats.lastActiveDate < yesterdayStr) {
    stats.streak = 1;
  }
  
  stats.lastActiveDate = today;
  saveStats(stats);
};

export const markWordLearned = (word: Word) => {
  const stats = getStats();
  if (!stats.learnedWords.includes(word.word)) {
    stats.learnedWords.push(word.word);
    stats.levelStats[word.level] += 1;
    saveStats(stats);
  }
};

export const markWordWeak = (word: string) => {
  const stats = getStats();
  if (!stats.weakWords.includes(word)) {
    stats.weakWords.push(word);
    saveStats(stats);
  }
};

export const removeFromWeakWords = (word: string) => {
  const stats = getStats();
  stats.weakWords = stats.weakWords.filter(w => w !== word);
  saveStats(stats);
};

export const getWeakWordsData = (): Word[] => {
  const stats = getStats();
  const saved = localStorage.getItem(STORAGE_KEYS.WORDS_BY_DATE);
  if (!saved) return [];
  
  const allDailyWords: DailyWords[] = JSON.parse(saved);
  const allWords: Word[] = allDailyWords.flatMap(d => d.words);
  
  return stats.weakWords.map(wordStr => 
    allWords.find(w => w.word === wordStr)
  ).filter((w): w is Word => !!w);
};
