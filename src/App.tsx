/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  BookOpen, 
  BrainCircuit, 
  BarChart3, 
  Flame, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Word, UserStats } from './types';
import { getStats, getDailyWords, saveDailyWords, updateStreak, markWordLearned, markWordWeak } from './lib/storage';
import { generateDailyWords } from './services/gemini';

type Screen = 'home' | 'learning' | 'quiz' | 'progress' | 'level-select';

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            top: -20, 
            left: `${Math.random() * 100}%`,
            rotate: 0,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            top: '120%',
            rotate: 360 * 2,
            left: `${(Math.random() * 100) + (Math.random() * 20 - 10)}%`
          }}
          transition={{ 
            duration: Math.random() * 2 + 2,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2
          }}
          className="absolute w-3 h-3 rounded-sm"
          style={{ 
            backgroundColor: ['#000', '#666', '#999', '#ccc'][Math.floor(Math.random() * 4)] 
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [words, setWords] = useState<Word[]>([]);
  const [stats, setStats] = useState<UserStats>(getStats());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'B2' | 'C1' | 'C2'>('all');
  const [quizLevel, setQuizLevel] = useState<'B2' | 'C1' | 'C2' | null>(null);

  useEffect(() => {
    const init = async () => {
      const today = new Date().toISOString().split('T')[0];
      let dailyWords = getDailyWords(today);
      
      if (!dailyWords) {
        setLoading(true);
        try {
          dailyWords = await generateDailyWords(stats.learnedWords);
          if (dailyWords.length > 0) {
            saveDailyWords(today, dailyWords);
          }
        } catch (error) {
          console.error("Error generating words", error);
        }
      }
      
      setWords(dailyWords || []);
      updateStreak();
      setStats(getStats());
      setLoading(false);
    };
    init();
  }, []);

  const filteredWords = filter === 'all' ? words : words.filter(w => w.level === filter);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">VocaRise</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-bold text-sm border border-orange-100">
            <Flame size={16} fill="currentColor" />
            <span>{stats.streak}</span>
          </div>
          <button 
            onClick={() => setScreen('progress')}
            className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 hover:bg-black hover:text-white transition-all"
          >
            <BarChart3 size={16} />
          </button>
        </div>
      </nav>

      <main className="pt-20 px-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-[60vh] gap-4"
            >
              <RefreshCw className="animate-spin text-gray-400" size={40} />
              <p className="text-gray-500 font-medium italic">Generating your daily 7 words...</p>
            </motion.div>
          ) : (
            <>
              {screen === 'home' && (
                <HomeScreen 
                  words={words} 
                  onStartLearning={() => setScreen('learning')} 
                  onStartLevelQuiz={() => setScreen('level-select')}
                  learnedToday={words.filter(w => stats.learnedWords.some(lw => lw.word === w.word)).length}
                />
              )}
              {screen === 'level-select' && (
                <LevelSelectScreen 
                  onSelect={(level) => {
                    setQuizLevel(level);
                    setFilter(level);
                    setScreen('quiz');
                  }} 
                />
              )}
              {screen === 'learning' && (
                <LearningScreen 
                  words={filteredWords} 
                  filter={filter} 
                  setFilter={setFilter} 
                  onComplete={() => setScreen('home')} 
                />
              )}
              {screen === 'quiz' && (
                <QuizScreen 
                  words={filteredWords} 
                  filter={filter} 
                  setFilter={setFilter} 
                  isLevelMode={quizLevel !== null}
                  onComplete={() => {
                    setStats(getStats());
                    setQuizLevel(null);
                    setFilter('all');
                    setScreen('progress');
                  }} 
                />
              )}
              {screen === 'progress' && <ProgressScreen stats={stats} />}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <NavButton active={screen === 'home'} icon={<Home size={24} />} label="Home" onClick={() => setScreen('home')} />
        <NavButton active={screen === 'learning'} icon={<BookOpen size={24} />} label="Learn" onClick={() => setScreen('learning')} />
        <NavButton active={screen === 'quiz'} icon={<BrainCircuit size={24} />} label="Quiz" onClick={() => setScreen('quiz')} />
        <NavButton active={screen === 'progress'} icon={<BarChart3 size={24} />} label="Stats" onClick={() => setScreen('progress')} />
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-black' : 'text-gray-400'}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function LevelBadge({ level }: { level: string }) {
  const className = level === 'B2' ? 'badge-b2' : level === 'C1' ? 'badge-c1' : 'badge-c2';
  return <span className={className}>{level}</span>;
}

function PrincuAvatar({ mood }: { mood: 'happy' | 'thinking' | 'excited' | 'sad' }) {
  const blinkVariants = {
    happy: { scaleY: [1, 0.1, 1], transition: { repeat: Infinity, duration: 3, times: [0, 0.1, 0.2] } },
    thinking: { scaleY: [1, 0.1, 1], transition: { repeat: Infinity, duration: 4, times: [0, 0.1, 0.2] } },
    excited: { scaleY: 1 },
    sad: { scaleY: [1, 0.5, 1], transition: { repeat: Infinity, duration: 5 } },
  };

  const headVariants = {
    happy: { y: [0, -4, 0], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } },
    thinking: { rotate: [0, 10, 0], transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } },
    excited: { y: [0, -10, 0], scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 0.6, ease: "easeInOut" } },
    sad: { y: [0, 2, 0], rotate: [0, -5, 0], transition: { repeat: Infinity, duration: 4, ease: "easeInOut" } },
  };

  const earVariants = {
    happy: { rotate: [0, 5, 0], transition: { repeat: Infinity, duration: 2.5 } },
    thinking: { rotate: [0, -10, 0], transition: { repeat: Infinity, duration: 2 } },
    excited: { rotate: [0, 15, -15, 0], transition: { repeat: Infinity, duration: 0.8 } },
    sad: { rotate: [0, 20, 0], transition: { repeat: Infinity, duration: 4 } },
  };

  return (
    <motion.div 
      variants={headVariants}
      animate={mood}
      className="w-16 h-16 relative flex-shrink-0"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        {/* Ears */}
        <motion.path 
          variants={earVariants}
          d="M20 40 L35 10 L50 40 Z" 
          fill="black" 
          className="origin-bottom"
        />
        <motion.path 
          variants={earVariants}
          d="M80 40 L65 10 L50 40 Z" 
          fill="black" 
          className="origin-bottom"
        />
        
        {/* Head */}
        <circle cx="50" cy="55" r="40" fill="black" />
        
        {/* Eyes */}
        <motion.g variants={blinkVariants} className="origin-center">
          <circle cx="35" cy="50" r={mood === 'excited' ? "7" : "5"} fill="white" />
          <circle cx="65" cy="50" r={mood === 'excited' ? "7" : "5"} fill="white" />
          {mood === 'thinking' && (
            <>
              <motion.circle 
                animate={{ cx: [35, 38, 32, 35], cy: [50, 47, 47, 50] }}
                transition={{ repeat: Infinity, duration: 4 }}
                cx="35" cy="50" r="2" fill="black" 
              />
              <motion.circle 
                animate={{ cx: [65, 68, 62, 65], cy: [50, 47, 47, 50] }}
                transition={{ repeat: Infinity, duration: 4 }}
                cx="65" cy="50" r="2" fill="black" 
              />
            </>
          )}
          {mood === 'happy' && (
            <>
              <circle cx="35" cy="50" r="2" fill="black" />
              <circle cx="65" cy="50" r="2" fill="black" />
            </>
          )}
          {mood === 'excited' && (
            <>
              <motion.circle 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                cx="35" cy="50" r="3" fill="black" 
              />
              <motion.circle 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                cx="65" cy="50" r="3" fill="black" 
              />
            </>
          )}
        </motion.g>

        {/* Nose & Whiskers */}
        <path d="M45 65 L55 65 L50 70 Z" fill="#FFB6C1" />
        <path d="M30 65 L10 60 M30 70 L10 75 M70 65 L90 60 M70 70 L90 75" stroke="white" strokeWidth="1" />
      </svg>
    </motion.div>
  );
}

function PrincuGuide({ message, mood = 'happy' }: { message: string, mood?: 'happy' | 'thinking' | 'excited' | 'sad' }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-4 mb-8"
    >
      <PrincuAvatar mood={mood} />
      <div className="relative flex-1">
        <div className="bg-white border-2 border-black p-4 rounded-2xl rounded-bl-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Princu</p>
          <p className="text-sm font-bold leading-relaxed text-black">{message}</p>
        </div>
        <div className="absolute -left-2 bottom-2 w-4 h-4 bg-white border-l-2 border-b-2 border-black transform rotate-45" />
      </div>
    </motion.div>
  );
}

function HomeScreen({ words, onStartLearning, onStartLevelQuiz, learnedToday }: { words: Word[], onStartLearning: () => void, onStartLevelQuiz: () => void, learnedToday: number }) {
  const progress = (learnedToday / 7) * 100;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <PrincuGuide 
        message={learnedToday === 7 
          ? "You've finished your daily goal! I'm so proud of you! 🐱✨" 
          : learnedToday > 0 
            ? `You've learned ${learnedToday} words today. Just ${7 - learnedToday} more to go! 🐾`
            : "Meow! Ready to boost your English skills today? Let's start with your daily words!"
        } 
        mood={learnedToday === 7 ? 'excited' : 'happy'} 
      />
      
      {/* Daily Goal Card */}
      <div className="card p-6 bg-black text-white overflow-hidden relative">
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Daily Goal</h3>
            <span className="text-sm font-black opacity-60">{learnedToday} / 7 words</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-white"
            />
          </div>
          <p className="text-sm opacity-80 font-medium">
            {learnedToday === 7 ? "Goal reached! You're a star! 🌟" : "Keep going to maintain your streak!"}
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12 select-none pointer-events-none">
          🔥
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Today's Words</h2>
        <p className="text-gray-500">Master these 7 words to grow your vocabulary.</p>
      </div>

      <div className="space-y-3">
        {words.map((word, idx) => (
          <div key={idx} className="card p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">{word.word}</h3>
                <LevelBadge level={word.level} />
              </div>
              <p className="text-gray-600 text-sm">{word.meaning_bn}</p>
            </div>
            <ChevronRight className="text-gray-300" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button onClick={onStartLearning} className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2">
          Start Learning <ChevronRight size={20} />
        </button>
        <button onClick={onStartLevelQuiz} className="w-full btn-outline py-4 text-lg flex items-center justify-center gap-2">
          Level-Wise Quiz <BrainCircuit size={20} />
        </button>
      </div>
    </motion.div>
  );
}

function LevelSelectScreen({ onSelect }: { onSelect: (level: 'B2' | 'C1' | 'C2') => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <PrincuGuide message="Choose a level you want to master! B2 is for upper-intermediate, C1 is advanced, and C2 is for pros like me! 🐾" mood="thinking" />
      
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-center">Select CEFR Level</h2>
        <p className="text-gray-500 text-center">Which level would you like to quiz today?</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <LevelCard 
          level="B2" 
          title="Upper Intermediate" 
          description="Focus on complex topics and fluent interaction."
          color="border-blue-600"
          onClick={() => onSelect('B2')}
        />
        <LevelCard 
          level="C1" 
          title="Advanced" 
          description="Understand a wide range of demanding, longer texts."
          color="border-purple-600"
          onClick={() => onSelect('C1')}
        />
        <LevelCard 
          level="C2" 
          title="Proficiency" 
          description="Understand with ease virtually everything heard or read."
          color="border-black"
          onClick={() => onSelect('C2')}
        />
      </div>
    </motion.div>
  );
}

function LevelCard({ level, title, description, color, onClick }: { level: string, title: string, description: string, color: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`card p-6 text-left flex items-center justify-between border-l-8 ${color} hover:scale-[1.02] active:scale-[0.98] transition-all`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold">{title}</h3>
          <LevelBadge level={level} />
        </div>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ChevronRight className="text-gray-300" />
    </button>
  );
}

function ProgressBar({ current, total }: { current: number, total: number }) {
  const progress = (current / total) * 100;
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-black/5">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        className="h-full bg-black"
      />
    </div>
  );
}

function LearningScreen({ words, filter, setFilter, onComplete }: { words: Word[], filter: string, setFilter: (f: any) => void, onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const word = words[currentIndex];

  const getPrincuMessage = () => {
    if (filter !== 'all') {
      return `Focusing on ${filter} words? Smart choice! This level is perfect for your growth. 🐾`;
    }
    if (currentIndex === 0) {
      return "Let's start with some fresh words! Tap the card to see the meaning. 🐱";
    }
    if (currentIndex === words.length - 1) {
      return "Almost there! One last word to master for today. You're doing great! ✨";
    }
    return `Word ${currentIndex + 1} of ${words.length}. Keep going, you're building a strong vocabulary! 🐾`;
  };

  const next = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      markWordLearned(word);
    } else {
      markWordLearned(word);
      onComplete();
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  if (words.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-gray-500">No words found for this level today.</p>
        <button onClick={() => setFilter('all')} className="btn-outline">Show All Levels</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PrincuGuide message={getPrincuMessage()} mood={isFlipped ? 'excited' : 'happy'} />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Flashcards</h2>
        <div className="flex gap-2">
          {(['all', 'B2', 'C1', 'C2'] as const).map(l => (
            <button 
              key={l}
              onClick={() => { setFilter(l); setCurrentIndex(0); setIsFlipped(false); }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${filter === l ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-96 perspective-1000">
        <motion.div 
          className="w-full h-full relative preserve-3d cursor-pointer"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden card flex flex-col items-center justify-center p-8 text-center gap-4">
            <LevelBadge level={word.level} />
            <h3 className="text-4xl font-black tracking-tight">{word.word}</h3>
            <p className="text-gray-400 text-sm italic">Tap to flip</p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden card flex flex-col items-center justify-center p-8 text-center gap-6 rotate-y-180">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Meaning</p>
              <p className="text-2xl font-bold text-black">{word.meaning_bn}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Explanation</p>
              <p className="text-gray-700 leading-relaxed">{word.explanation}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Example</p>
              <p className="text-gray-600 italic">"{word.sentence}"</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <button onClick={prev} disabled={currentIndex === 0} className="flex-1 btn-outline py-4 flex items-center justify-center gap-2 disabled:opacity-30">
          <ChevronLeft size={20} /> Previous
        </button>
        <button onClick={next} className="flex-1 btn-primary py-4 flex items-center justify-center gap-2">
          {currentIndex === words.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={20} />
        </button>
      </div>

      <div className="pt-4">
        <ProgressBar current={currentIndex + 1} total={words.length} />
      </div>
    </motion.div>
  );
}

function QuizScreen({ words, filter, setFilter, isLevelMode, onComplete }: { words: Word[], filter: string, setFilter: (f: any) => void, isLevelMode?: boolean, onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizType, setQuizType] = useState<'mcq' | 'fill'>(Math.random() > 0.5 ? 'mcq' : 'fill');
  const [fillValue, setFillValue] = useState('');

  const word = words[currentIndex];
  
  // Generate options for MCQ
  const options = React.useMemo(() => {
    if (!word) return [];
    const others = words.filter(w => w.word !== word.word).map(w => w.meaning_bn);
    const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    return [...shuffled, word.meaning_bn].sort(() => 0.5 - Math.random());
  }, [word, words]);

  // Princu messages based on state
  const getPrincuMessage = () => {
    if (showResult) return ""; // Handled in result screen
    
    if (selectedOption === null) {
      if (isLevelMode) {
        return `Welcome to the ${filter} Challenge! These words are tough, but I know you can handle them! 🐱💪`;
      }
      return `Look at this word: "${word.word}". Do you know what it means? Take your time, I'm watching! 🐾`;
    }
    if (isCorrect) {
      return `Purr-fect! You got it right! "${word.word}" means "${word.meaning_bn}". Keep it up! 🐱✨`;
    }
    return `Oh no! Don't worry, even cats make mistakes. "${word.word}" actually means "${word.meaning_bn}". Let's learn it together! 😿`;
  };

  const getPrincuMood = () => {
    if (selectedOption === null) return 'thinking';
    if (isCorrect) return 'excited';
    return 'sad';
  };

  const handleMcqSubmit = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    const correct = option === word.meaning_bn;
    setIsCorrect(correct);
    if (correct) setScore(score + 1);
    else markWordWeak(word.word);
  };

  const handleFillSubmit = () => {
    if (selectedOption) return;
    const correct = fillValue.toLowerCase().trim() === word.word.toLowerCase().trim();
    setSelectedOption(fillValue);
    setIsCorrect(correct);
    if (correct) setScore(score + 1);
    else markWordWeak(word.word);
  };

  const next = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsCorrect(null);
      setFillValue('');
      setQuizType(Math.random() > 0.5 ? 'mcq' : 'fill');
    } else {
      setShowResult(true);
    }
  };

  if (words.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-gray-500">No words found for this level today.</p>
        <button onClick={() => setFilter('all')} className="btn-outline">Show All Levels</button>
      </div>
    );
  }

  if (showResult) {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-6"
      >
        {score === words.length && <Confetti />}
        <PrincuGuide 
          message={score === words.length 
            ? "UNBELIEVABLE! You're a vocabulary master! I'm so proud of you! 🐱🏆" 
            : score > words.length / 2 
              ? "Great job! You're getting better every day. Let's keep practicing! 🐾"
              : "That was a tough one! Don't give up, I'll help you learn these words! 😿"
          } 
          mood={score === words.length ? 'excited' : score > words.length / 2 ? 'happy' : 'sad'}
        />
        
        <div className="card p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-white" size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Quiz Complete!</h2>
            <p className="text-gray-500">You scored {score} out of {words.length}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => {
              setCurrentIndex(0);
              setScore(0);
              setShowResult(false);
              setSelectedOption(null);
              setIsCorrect(null);
            }} className="flex-1 btn-outline flex items-center justify-center gap-2">
              <RotateCcw size={18} /> Retry
            </button>
            <button onClick={onComplete} className="flex-1 btn-primary">View Progress</button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PrincuGuide message={getPrincuMessage()} mood={getPrincuMood()} />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{isLevelMode ? `${filter} Challenge` : 'Daily Quiz'}</h2>
        {!isLevelMode && (
          <div className="flex gap-2">
            {(['all', 'B2', 'C1', 'C2'] as const).map(l => (
              <button 
                key={l}
                onClick={() => { setFilter(l); setCurrentIndex(0); setSelectedOption(null); setIsCorrect(null); }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${filter === l ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      <motion.div 
        animate={selectedOption && !isCorrect ? { x: [-10, 10, -10, 10, 0] } : {}}
        className="card p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Question {currentIndex + 1} of {words.length}</span>
          <LevelBadge level={word.level} />
        </div>

        <ProgressBar current={currentIndex + 1} total={words.length} />

        {quizType === 'mcq' ? (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center">What is the meaning of "<span className="underline decoration-2 underline-offset-4">{word.word}</span>"?</h3>
            <div className="grid grid-cols-1 gap-3">
              {options.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => handleMcqSubmit(opt)}
                  disabled={selectedOption !== null}
                  className={`p-4 rounded-xl border-2 text-left font-medium transition-all ${
                    selectedOption === opt 
                      ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')
                      : (selectedOption !== null && opt === word.meaning_bn ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-black')
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{opt}</span>
                    {selectedOption === opt && (isCorrect ? <CheckCircle2 size={18} className="text-green-600" /> : <XCircle size={18} className="text-red-600" />)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-gray-500 italic">"{word.sentence.replace(new RegExp(word.word, 'gi'), '_______')}"</p>
              <h3 className="text-xl font-bold">Fill in the blank:</h3>
              <p className="text-sm text-gray-400">Meaning: {word.meaning_bn}</p>
            </div>
            <div className="space-y-4">
              <input 
                type="text"
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                disabled={selectedOption !== null}
                placeholder="Type the word here..."
                className={`w-full p-4 rounded-xl border-2 outline-none transition-all text-center text-xl font-bold ${
                  selectedOption !== null 
                    ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')
                    : 'border-gray-100 focus:border-black'
                }`}
              />
              {selectedOption === null ? (
                <button onClick={handleFillSubmit} className="w-full btn-primary py-4">Submit Answer</button>
              ) : (
                <div className="text-center">
                  {isCorrect ? (
                    <p className="text-green-600 font-bold">Correct!</p>
                  ) : (
                    <p className="text-red-600 font-bold">Incorrect. The word was: {word.word}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {selectedOption !== null && (
        <motion.button 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={next} 
          className="w-full btn-primary py-4 flex items-center justify-center gap-2"
        >
          {currentIndex === words.length - 1 ? 'Finish Quiz' : 'Next Question'} <ChevronRight size={20} />
        </motion.button>
      )}
    </motion.div>
  );
}

function ProgressScreen({ stats }: { stats: UserStats }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Your Progress</h2>
        <p className="text-gray-500">Track your journey to English mastery.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-6 flex flex-col items-center gap-2">
          <span className="text-4xl font-black">{stats.learnedWords.length}</span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Words Learned</span>
        </div>
        <div className="card p-6 flex flex-col items-center gap-2">
          <span className="text-4xl font-black">{stats.streak}</span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Day Streak</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Level Breakdown</h3>
        <div className="space-y-3">
          <LevelProgress label="B2 (Upper-Intermediate)" count={stats.levelStats.B2} color="bg-blue-600" />
          <LevelProgress label="C1 (Advanced)" count={stats.levelStats.C1} color="bg-purple-600" />
          <LevelProgress label="C2 (Proficiency)" count={stats.levelStats.C2} color="bg-black" />
        </div>
      </div>

      {stats.weakWords.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Words to Review</h3>
          <div className="flex flex-wrap gap-2">
            {stats.weakWords.slice(-10).map((w, i) => (
              <span key={i} className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium border border-red-100">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function LevelProgress({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span>{label}</span>
        <span>{count} words</span>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <motion.div 
          className={`${color} h-full`} 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (count / 50) * 100)}%` }} // Arbitrary 50 goal for visual
        />
      </div>
    </div>
  );
}
