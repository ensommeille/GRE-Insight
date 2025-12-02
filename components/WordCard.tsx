import React from 'react';
import { GREWordData } from '../types';
import { VolumeIcon, StarIcon } from './Icons';

interface WordCardProps {
  data: GREWordData;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  fontClass: string;
}

const Card = ({ children, className = '', delay = 0 }: { children?: React.ReactNode; className?: string; delay?: number }) => (
  <div 
    className={`bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 ${className} card-enter`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">{children}</h3>
);

export const WordCard: React.FC<WordCardProps> = ({ data, isFavorite, onToggleFavorite, fontClass }) => {
  const playAudio = () => {
    const utterance = new SpeechSynthesisUtterance(data.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      
      {/* 1. Basic Info */}
      <Card delay={0}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className={`text-4xl md:text-5xl font-bold text-stone-800 dark:text-stone-100 ${fontClass}`}>
                {data.word}
              </h1>
              <span className="text-xl text-stone-500 font-mono">{data.phonetic}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
               <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                {data.partOfSpeech}
              </span>
              <p className="text-xl text-stone-700 dark:text-stone-300 font-medium">
                {data.definition}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={playAudio}
              className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 transition-colors"
              title="Pronounce"
            >
              <VolumeIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={onToggleFavorite}
              className={`p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors ${isFavorite ? 'text-amber-400' : 'text-stone-300'}`}
              title="Add to Word Book"
            >
              <StarIcon className="w-6 h-6" filled={isFavorite} />
            </button>
          </div>
        </div>
      </Card>

      {/* 2. GRE Context */}
      <Card delay={100}>
        <SectionTitle>GRE Context</SectionTitle>
        <div className="space-y-4">
          <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
            {data.greContext.explanation}
          </p>
          <div className="pl-4 border-l-4 border-stone-200 dark:border-stone-600 italic">
            <p className={`text-lg text-stone-800 dark:text-stone-200 mb-1 ${fontClass}`}>
              "{data.greContext.sentenceEn}"
            </p>
            <p className="text-stone-500 text-sm">
              {data.greContext.sentenceCn}
            </p>
          </div>
        </div>
      </Card>

      {/* 3 & 4. Unified Etymology & Mnemonic Card */}
      <Card delay={200}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Top Left: Origin & Structure */}
          <div>
            <SectionTitle>Etymology</SectionTitle>
            <div className="space-y-3 text-stone-700 dark:text-stone-300 text-sm">
              <p><span className="font-semibold text-stone-900 dark:text-stone-100">来源：</span>{data.etymology.origin}</p>
              <p><span className="font-semibold text-stone-900 dark:text-stone-100">结构：</span>{data.etymology.structure}</p>
            </div>
          </div>
          
          {/* Top Right: Logic */}
          <div className="md:border-l md:border-stone-100 md:dark:border-stone-700 md:pl-8">
            <SectionTitle>Core Logic</SectionTitle>
            <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
              {data.etymology.logic}
            </p>
          </div>
        </div>

        {/* Bottom: Nested Memory Aid */}
        <div className="relative mt-2 p-5 bg-amber-50/50 dark:bg-stone-900/50 border border-amber-100/50 dark:border-stone-700 rounded-xl">
           <div className="absolute top-0 left-0 w-1 h-full bg-amber-300/50 rounded-l-xl"></div>
           <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">
             Memory Aid 💡
           </h4>
           <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              {data.mnemonic}
           </p>
        </div>
      </Card>

      {/* 5. Cognates */}
      <Card delay={300}>
        <SectionTitle>Cognates</SectionTitle>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-stone-400 uppercase bg-stone-50 dark:bg-stone-900/50 rounded-lg">
              <tr>
                <th className="px-4 py-2 rounded-l-lg">Word</th>
                <th className="px-4 py-2">Pos.</th>
                <th className="px-4 py-2 rounded-r-lg">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
              {data.cognates.map((c, i) => (
                <tr key={i} className="hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-200">{c.word}</td>
                  <td className="px-4 py-3 text-stone-500 italic">{c.pos}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{c.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 6. Synonyms & Antonyms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card delay={400}>
          <SectionTitle>Synonyms</SectionTitle>
          <ul className="space-y-2">
            {data.synonyms.map((s, i) => (
              <li key={i} className="flex justify-between items-center text-sm border-b border-stone-50 dark:border-stone-700/50 last:border-0 pb-1 last:pb-0">
                <span className="font-semibold text-stone-700 dark:text-stone-300">{s.word}</span>
                <span className="text-stone-400">{s.meaning}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card delay={500}>
           <SectionTitle>Antonyms</SectionTitle>
           <ul className="space-y-2">
            {data.antonyms.map((a, i) => (
              <li key={i} className="flex justify-between items-center text-sm border-b border-stone-50 dark:border-stone-700/50 last:border-0 pb-1 last:pb-0">
                <span className="font-semibold text-stone-700 dark:text-stone-300">{a.word}</span>
                <span className="text-stone-400">{a.meaning}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};