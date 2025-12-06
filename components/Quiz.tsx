import React, { useState, useEffect } from 'react';
import { GREWordData, QuizQuestion, Settings } from '../types';
import { ArrowLeftIcon, LightningIcon } from './Icons';

interface QuizProps {
  wordCache: Record<string, GREWordData>;
  favorites: GREWordData[];
  settings: Settings;
  onBack: () => void;
  fontClass: string;
  onResult: (word: string, isCorrect: boolean) => void;
}

export const Quiz: React.FC<QuizProps> = ({ wordCache, favorites, settings, onBack, fontClass, onResult }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    generateQuiz();
  }, []);

  const generateQuiz = () => {
    // Determine Source Pool
    let sourcePool: GREWordData[] = [];
    if (settings.quizSource === 'FAVORITES') {
      sourcePool = [...favorites];
    } else {
      // Explicitly cast to GREWordData[] to avoid type inference issues
      sourcePool = Object.values(wordCache) as GREWordData[];
    }

    if (sourcePool.length < 4) return;

    // Filter valid words (basic sanity check)
    let candidates = sourcePool.filter(w => w && w.word && w.definition);

    // Apply Sorting Mode
    if (settings.quizMode === 'WEAKEST') {
      // Sort by mastery score ascending (weakest first)
      // Add a slight random factor to sorting so equal scores aren't always in same order
      candidates.sort((a, b) => {
        const scoreA = a.stats?.masteryScore || 0;
        const scoreB = b.stats?.masteryScore || 0;
        if (scoreA === scoreB) return 0.5 - Math.random();
        return scoreA - scoreB;
      });
    } else {
      // Random Shuffle
      candidates.sort(() => 0.5 - Math.random());
    }

    // Limit Question Count
    const targetWords = candidates.slice(0, settings.quizQuestionCount || 5);

    // Generate Questions
    const allWords = Object.values(wordCache) as GREWordData[]; // Use all words for distractors for better variety

    const newQuestions: QuizQuestion[] = targetWords.map((wordData, i) => {
      // Pick 3 distractors from ALL cached words to ensure we have enough options even if Favorites list is small
      const distractors = allWords
        .filter(w => w.word !== wordData.word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.definition);

      const options = [...distractors, wordData.definition].sort(() => 0.5 - Math.random());

      return {
        id: `q-${i}`,
        question: wordData.word,
        options,
        correctAnswer: wordData.definition,
        wordData
      };
    });

    setQuestions(newQuestions);
  };

  const handleOptionClick = (option: string) => {
    if (selectedOption) return; // Prevent changing answer
    setSelectedOption(option);

    const isCorrect = option === questions[currentQIndex].correctAnswer;
    const currentWord = questions[currentQIndex].wordData.word;

    // Notify parent to update stats
    onResult(currentWord, isCorrect);

    if (isCorrect) {
      setScore(s => s + 1);
    }

    // Auto next after delay
    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setIsFinished(true);
      }
    }, 1500);
  };

  if (questions.length === 0) {
    const minWords = 4;
    return (
      <div className="max-w-md mx-auto text-center mt-20 animate-fade-in">
        <div className="inline-block p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4 text-amber-600 dark:text-amber-400">
          <LightningIcon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-stone-800 dark:text-stone-100">Not Enough Words</h3>
        <p className="text-stone-500 mb-6">
          {settings.quizSource === 'FAVORITES' 
            ? `Add at least ${minWords} words to your favorites to start a quiz.` 
            : `Search and learn at least ${minWords} words to unlock the Daily Quiz.`}
        </p>
        <button onClick={onBack} className="px-6 py-2 bg-stone-200 dark:bg-stone-700 rounded-lg font-medium">
          Back
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 animate-fade-in">
        <h2 className="text-3xl font-bold mb-4 text-stone-800 dark:text-stone-100">Quiz Complete!</h2>
        <div className="text-6xl mb-6">🎉</div>
        <p className="text-xl text-stone-600 dark:text-stone-300 mb-8">
          You scored <span className="font-bold text-indigo-600 dark:text-indigo-400">{score} / {questions.length}</span>
        </p>
        <button 
          onClick={onBack}
          className="w-full py-3 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold shadow-lg"
        >
          Finish
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600">
           <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <div className="text-sm font-mono text-stone-400">
           Question {currentQIndex + 1} / {questions.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full mb-8 overflow-hidden">
        <div 
          className="h-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${((currentQIndex) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-stone-800 rounded-3xl p-10 shadow-lg border border-stone-200 dark:border-stone-700 text-center mb-8">
         <h2 className={`text-4xl md:text-5xl font-bold text-stone-800 dark:text-stone-100 mb-4 ${fontClass}`}>
           {currentQ.question}
         </h2>
         <p className="text-stone-400 font-mono">{currentQ.wordData.phonetic}</p>
      </div>

      {/* Options */}
      <div className="grid gap-4">
        {currentQ.options.map((option, idx) => {
          let statusClass = "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500";
          
          if (selectedOption) {
            if (option === currentQ.correctAnswer) {
              statusClass = "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200";
            } else if (option === selectedOption) {
              statusClass = "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200";
            } else {
              statusClass = "opacity-50 border-stone-200 dark:border-stone-800";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(option)}
              disabled={!!selectedOption}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all font-medium text-lg ${statusClass} ${selectedOption ? '' : 'shadow-sm hover:shadow-md'}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};