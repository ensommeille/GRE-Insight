import React, { useState } from 'react';
import { GREWordData } from '../types';
import { CloseIcon, VolumeIcon } from './Icons';

interface FlashcardsProps {
  words: GREWordData[];
  onClose: () => void;
  fontClass: string;
}

export const Flashcards: React.FC<FlashcardsProps> = ({ words, onClose, fontClass }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // If no words, show empty state
  if (words.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white dark:bg-stone-800 p-8 rounded-2xl max-w-sm text-center shadow-2xl">
          <p className="text-lg mb-4 text-stone-600 dark:text-stone-300">No words in your Word Book yet.</p>
          <button onClick={onClose} className="px-6 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors">Close</button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 200);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
    }, 200);
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-100/90 dark:bg-stone-900/95 backdrop-blur-sm p-4">
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 p-2 bg-white dark:bg-stone-800 rounded-full shadow-md text-stone-500 hover:text-stone-800 transition-colors z-50"
      >
        <CloseIcon className="w-6 h-6" />
      </button>

      {/* Card Container */}
      <div 
        className="w-full max-w-md perspective-1000 cursor-pointer group" 
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* 
          Grid Wrapper: Allows stacking Front and Back faces in the same cell.
          The wrapper expands to the height of the tallest face (since both are relative in grid).
        */}
        <div className={`relative grid grid-cols-1 duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front Face */}
          <div className="col-start-1 row-start-1 backface-hidden bg-white dark:bg-stone-800 rounded-3xl shadow-xl border border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center p-8 sm:p-12 min-h-[300px]">
            
            <h2 className={`text-4xl sm:text-5xl font-bold text-stone-800 dark:text-stone-100 ${fontClass} mb-4 text-center break-words w-full`}>
              {currentWord.word}
            </h2>
            <p className="text-xl text-stone-500 font-mono mb-8">{currentWord.phonetic}</p>
            
            <button 
              onClick={playAudio} 
              className="p-3 bg-stone-100 dark:bg-stone-700 rounded-full text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors z-10"
            >
              <VolumeIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Back Face */}
          {/* Note: rotate-y-180 makes it face away initially. When parent rotates 180, this becomes 0 (visible) */}
          <div className="col-start-1 row-start-1 backface-hidden rotate-y-180 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-3xl shadow-xl border border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center p-8 sm:p-12 min-h-[300px]">
             
             <p className="text-2xl font-medium mb-2 text-center">{currentWord.definition}</p>
             <p className="text-stone-400 italic mb-6 text-sm bg-stone-100 dark:bg-stone-900/50 px-2 py-1 rounded">{currentWord.partOfSpeech}</p>
             
             <div className="w-12 border-t-2 border-stone-100 dark:border-stone-700 my-4"></div>
             
             <div className="text-center w-full">
               <p className="text-stone-400 dark:text-stone-500 text-xs font-bold uppercase tracking-wider mb-3">GRE Context</p>
               <p className="text-stone-600 dark:text-stone-300 leading-relaxed mb-4 text-sm">
                 {currentWord.greContext.explanation}
               </p>
               <div className="bg-amber-50 dark:bg-stone-900/30 p-4 rounded-xl border border-amber-100 dark:border-stone-700/50">
                 <p className={`text-lg text-stone-800 dark:text-stone-200 ${fontClass}`}>
                   "{currentWord.greContext.sentenceEn}"
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-4 sm:gap-8 mt-10">
        <button 
          onClick={handlePrev} 
          className="px-6 py-3 bg-white dark:bg-stone-800 rounded-full shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md hover:bg-stone-50 dark:hover:bg-stone-700 transition-all font-semibold text-stone-600 dark:text-stone-300"
        >
          Prev
        </button>
        <span className="text-stone-500 font-mono text-sm">
          {currentIndex + 1} / {words.length}
        </span>
        <button 
          onClick={handleNext} 
          className="px-6 py-3 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full shadow-sm hover:shadow-lg hover:bg-stone-700 dark:hover:bg-stone-200 transition-all font-semibold"
        >
          Next
        </button>
      </div>
    </div>
  );
};