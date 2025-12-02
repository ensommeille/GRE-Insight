import React, { useState } from 'react';
import { analyzeTextForGRE } from '../services/geminiService';
import { AnalyzedWord } from '../types';
import { SpinnerIcon, ArrowLeftIcon, BeakerIcon } from './Icons';

interface TextAnalyzerProps {
  onWordClick: (word: string) => void;
  onBack: () => void;
  fontClass: string;
}

export const TextAnalyzer: React.FC<TextAnalyzerProps> = ({ onWordClick, onBack, fontClass }) => {
  const [text, setText] = useState('');
  const [analyzedWords, setAnalyzedWords] = useState<AnalyzedWord[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mode, setMode] = useState<'INPUT' | 'RESULT'>('INPUT');

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    try {
      const results = await analyzeTextForGRE(text);
      setAnalyzedWords(results);
      setMode('RESULT');
    } catch (e) {
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to render text with highlighted words
  const renderHighlightedText = () => {
    let content = text;
    // Sort words by length descending to avoid replacing substrings incorrectly
    const sortedWords = [...analyzedWords].sort((a, b) => b.word.length - a.word.length);
    
    // We split by newlines to preserve paragraphs
    const paragraphs = content.split('\n').filter(p => p.trim());

    return paragraphs.map((para, pIdx) => {
      // For each paragraph, we need to tokenize safely
      const parts = para.split(' ');
      
      return (
        <p key={pIdx} className="mb-4 leading-relaxed text-lg text-stone-700 dark:text-stone-300">
          {parts.map((token, tIdx) => {
             // Remove punctuation for matching
             const cleanToken = token.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
             const match = sortedWords.find(aw => aw.word.toLowerCase() === cleanToken.toLowerCase());
             
             if (match) {
               return (
                 <span key={tIdx} className="group relative inline-block mx-0.5">
                    <span 
                      onClick={() => onWordClick(match.word)}
                      className="cursor-pointer font-bold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded px-0.5 transition-all"
                    >
                      {token}
                    </span>
                    {/* Tooltip */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-stone-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {match.definition}
                    </span>
                 </span>
               );
             }
             return <span key={tIdx}>{token} </span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors text-stone-500"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <BeakerIcon className="w-6 h-6" />
            </div>
            <h2 className={`text-2xl font-bold text-stone-800 dark:text-stone-100 ${fontClass}`}>Smart Text Analyzer</h2>
        </div>
      </div>

      {mode === 'INPUT' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste an article from The Economist, New York Times, etc. here..."
              className="w-full h-64 bg-transparent border-none resize-none focus:ring-0 text-stone-800 dark:text-stone-200 placeholder-stone-400"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || isAnalyzing}
            className="w-full py-4 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-stone-700 dark:hover:bg-stone-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
               <>
                 <SpinnerIcon className="w-5 h-5" /> Analyzing...
               </>
            ) : (
               "Analyze Text"
            )}
          </button>
          <p className="text-center text-sm text-stone-400">
            AI will identify advanced GRE vocabulary and provide instant definitions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="bg-white dark:bg-stone-800 p-8 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
              {renderHighlightedText()}
           </div>
           <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">
                Found {analyzedWords.length} GRE words
              </span>
              <button 
                onClick={() => setMode('INPUT')}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Analyze New Text
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
