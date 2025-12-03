import React from 'react';
import { GREWordData } from '../types';
import { SpinnerIcon, LightningIcon } from './Icons';

interface LoadingReviewProps {
  reviewWord: GREWordData;
}

export const LoadingReview: React.FC<LoadingReviewProps> = ({ reviewWord }) => {
  return (
    <div className="max-w-3xl mx-auto pt-8 animate-fade-in text-center px-4">
      {/* Loading Indicator */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-stone-100 dark:border-stone-800"></div>
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="text-stone-500 font-medium tracking-wide text-sm animate-pulse">
          Generating analysis...
        </p>
      </div>

      {/* Review Card */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-indigo-100 dark:border-indigo-900/30 p-8 max-w-lg mx-auto transform transition-all hover:scale-105 duration-500">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
          <LightningIcon className="w-3 h-3" /> Quick Review
        </div>
        
        <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-2 font-serif">
          {reviewWord.word}
        </h2>
        <p className="text-stone-400 font-mono text-sm mb-6">{reviewWord.phonetic}</p>
        
        <div className="bg-stone-50 dark:bg-stone-900/50 rounded-xl p-4 mb-4">
          <p className="text-lg text-stone-700 dark:text-stone-300 font-medium">
            {reviewWord.definition}
          </p>
        </div>

        <div className="text-left text-sm text-stone-500 dark:text-stone-400 italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
          "{reviewWord.greContext.sentenceEn}"
        </div>
      </div>
      
      <p className="mt-8 text-stone-400 text-xs">
        While you wait, review this word to strengthen your memory.
      </p>
    </div>
  );
};