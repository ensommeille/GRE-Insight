import React from 'react';
import { CloseIcon, ChartIcon, StarIcon, BookIcon, LightningIcon } from './Icons';
import { UserData } from '../types';

interface StatsModalProps {
  data: UserData;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ data, onClose }) => {
  const totalWords = Object.keys(data.wordCache).length;
  const favoritesCount = data.favorites.length;
  // Use real streak data or default to 0/1 if undefined (legacy data support)
  const streak = data.studyStats?.streakDays || (totalWords > 0 ? 1 : 0);
  
  // Use user defined goal or default 500
  const goal = data.settings.learningGoal || 500;
  
  // Calculate mastery level based on goal
  const masteryLevel = Math.min(100, Math.floor((totalWords / goal) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl p-6 w-full max-w-md border border-stone-100 dark:border-stone-700 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
          <CloseIcon className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-8">
           <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
             <ChartIcon className="w-8 h-8" />
           </div>
           <div>
             <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Learning Stats</h2>
             <p className="text-stone-500 text-sm">Your progress overview</p>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-stone-50 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-100 dark:border-stone-700/50">
             <div className="flex items-center gap-2 mb-2 text-stone-500 text-sm font-bold uppercase">
                <BookIcon className="w-4 h-4" /> Total Words
             </div>
             <p className="text-3xl font-bold text-stone-800 dark:text-stone-100">{totalWords}</p>
           </div>
           <div className="bg-stone-50 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-100 dark:border-stone-700/50">
             <div className="flex items-center gap-2 mb-2 text-amber-500 text-sm font-bold uppercase">
                <StarIcon className="w-4 h-4" filled /> Favorites
             </div>
             <p className="text-3xl font-bold text-stone-800 dark:text-stone-100">{favoritesCount}</p>
           </div>
        </div>

        <div className="space-y-6">
           <div>
             <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-stone-600 dark:text-stone-400">GRE Mastery Goal ({goal} Words)</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{masteryLevel}%</span>
             </div>
             <div className="h-3 w-full bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${masteryLevel}%` }} />
             </div>
           </div>

           <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
             <div className="flex items-center gap-3">
               <LightningIcon className="w-5 h-5 text-indigo-500" />
               <span className="text-indigo-900 dark:text-indigo-200 font-medium">Daily Streak</span>
             </div>
             <span className="text-xl font-bold text-indigo-600 dark:text-indigo-300">{streak} Days 🔥</span>
           </div>
        </div>
      </div>
    </div>
  );
};