import React from 'react';

const Pulse = ({ className = '' }: { className?: string }) => (
  <div className={`bg-stone-200 dark:bg-stone-700 animate-pulse rounded ${className}`} />
);

export const WordSkeleton = () => (
  <div className="space-y-6 max-w-3xl mx-auto pb-24">
    {/* Basic Info Skeleton */}
    <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-4 w-2/3">
           <div className="flex gap-4 items-baseline">
             <Pulse className="h-12 w-48" />
             <Pulse className="h-6 w-24" />
           </div>
           <div className="flex gap-2 items-center">
             <Pulse className="h-5 w-12" />
             <Pulse className="h-6 w-64" />
           </div>
        </div>
        <div className="flex gap-2">
          <Pulse className="h-10 w-10 rounded-full" />
          <Pulse className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>

    {/* GRE Context Skeleton */}
    <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
      <Pulse className="h-4 w-32 mb-2" />
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-5/6" />
      <div className="pl-4 border-l-4 border-stone-100 dark:border-stone-700 mt-4 space-y-2">
        <Pulse className="h-6 w-full" />
        <Pulse className="h-4 w-2/3" />
      </div>
    </div>

     {/* Unified Etymology/Logic/Memory Skeleton */}
     <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
           <div className="space-y-3">
             <Pulse className="h-4 w-24 mb-3" />
             <Pulse className="h-4 w-full" />
             <Pulse className="h-4 w-3/4" />
           </div>
           <div className="md:pl-8 md:border-l md:border-stone-100 space-y-3">
             <Pulse className="h-4 w-24 mb-3" />
             <Pulse className="h-4 w-full" />
             <Pulse className="h-4 w-5/6" />
           </div>
        </div>
        <div className="h-24 w-full rounded-xl bg-stone-50 dark:bg-stone-900/50 p-4">
           <Pulse className="h-4 w-32 mb-2" />
           <Pulse className="h-4 w-full" />
        </div>
     </div>

     {/* Grid Skeleton for bottom items */}
     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm h-48">
           <Pulse className="h-4 w-24 mb-4" />
           <div className="space-y-3">
             <Pulse className="h-4 w-full" />
             <Pulse className="h-4 w-3/4" />
             <Pulse className="h-4 w-1/2" />
           </div>
        </div>
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm h-48">
           <Pulse className="h-4 w-24 mb-4" />
           <Pulse className="h-20 w-full" />
        </div>
     </div>
  </div>
);