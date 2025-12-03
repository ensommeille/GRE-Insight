import React, { useState, useEffect, useRef } from 'react';
import { GREWordData, Settings, ViewMode, User, UserData, StudyStats, WordStats } from './types';
import { fetchWordData, fetchRandomGREWord } from './services/geminiService';
import { authService } from './services/authService';
import { WordCard } from './components/WordCard';
import { WordSkeleton } from './components/Skeleton';
import { Flashcards } from './components/Flashcards';
import { AuthModal } from './components/AuthModal';
import { TextAnalyzer } from './components/TextAnalyzer';
import { Quiz } from './components/Quiz';
import { StatsModal } from './components/StatsModal';
import { LoadingReview } from './components/LoadingReview';
import { 
  SearchIcon, 
  BookIcon, 
  CardStackIcon, 
  SettingsIcon, 
  CloseIcon, 
  ClockIcon,
  ArrowLeftIcon,
  UserIcon,
  LogoutIcon,
  CloudIcon,
  SpinnerIcon,
  BeakerIcon,
  LightningIcon,
  ChartIcon,
  DiceIcon,
  DownloadIcon,
  UploadIcon,
  SortIcon
} from './components/Icons';

export default function App() {
  // State
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentWord, setCurrentWord] = useState<GREWordData | null>(null);
  const [previousWord, setPreviousWord] = useState<GREWordData | null>(null); 
  const [error, setError] = useState<string | null>(null);
  const [reviewCandidate, setReviewCandidate] = useState<GREWordData | null>(null);
  
  // Data Persistence
  const [history, setHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<GREWordData[]>([]);
  const [wordCache, setWordCache] = useState<Record<string, GREWordData>>({});
  const [studyStats, setStudyStats] = useState<StudyStats>({
    streakDays: 0,
    lastStudyDate: ''
  });
  
  // Auth & Cloud State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.HOME);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sortMode, setSortMode] = useState<'TIME' | 'MASTERY'>('TIME');
  
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    serifFont: true,
    fontSize: 'medium'
  });

  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // --- Streak Logic ---
  const checkDailyStreak = (currentStats: StudyStats) => {
    const today = new Date().toISOString().split('T')[0];
    const { lastStudyDate, streakDays } = currentStats;

    if (lastStudyDate === today) return; // Already logged today

    let newStreak = 1;
    if (lastStudyDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastStudyDate === yesterdayStr) {
        newStreak = streakDays + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    setStudyStats({
      streakDays: newStreak,
      lastStudyDate: today
    });
  };

  // 1. Initial Load
  useEffect(() => {
    const savedFavs = localStorage.getItem('gre_favorites');
    const savedHist = localStorage.getItem('gre_history');
    const savedCache = localStorage.getItem('gre_cache');
    const savedStats = localStorage.getItem('gre_stats');
    const savedSettings = localStorage.getItem('gre_settings');

    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedHist) setHistory(JSON.parse(savedHist));
    if (savedCache) setWordCache(JSON.parse(savedCache));
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
    }
    
    let currentStats = { streakDays: 0, lastStudyDate: '' };
    if (savedStats) {
      currentStats = JSON.parse(savedStats);
      setStudyStats(currentStats);
    }

    // Calculate streak immediately on load
    checkDailyStreak(currentStats);

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      performCloudSync(currentUser, true);
    }
  }, []);

  // 2. Persist to Local Storage
  useEffect(() => { localStorage.setItem('gre_favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('gre_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('gre_cache', JSON.stringify(wordCache)); }, [wordCache]);
  useEffect(() => { localStorage.setItem('gre_stats', JSON.stringify(studyStats)); }, [studyStats]);
  useEffect(() => {
    localStorage.setItem('gre_settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // 3. Persist to Cloud
  useEffect(() => {
    if (!user) return;
    const timeoutId = setTimeout(() => {
      setIsSyncing(true);
      const userData: UserData = { favorites, history, settings, wordCache, studyStats };
      authService.saveUserData(user.id, userData).then(() => setIsSyncing(false));
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [favorites, history, settings, wordCache, studyStats, user]);

  // 4. Sync Listener
  useEffect(() => {
    const unsubscribe = authService.onSyncEvent(async (event) => {
      if (event.type === 'LOGOUT') {
        setUser(null);
        setShowUserMenu(false);
        return;
      }
      if (event.type === 'LOGIN' || event.type === 'DATA_UPDATE') {
        const currentUser = authService.getCurrentUser();
        if (currentUser && (!user || user.id !== currentUser.id)) setUser(currentUser);
        if (currentUser) {
          setIsSyncing(true);
          try {
            const cloudData = await authService.fetchUserData(currentUser.id);
            if (cloudData) {
              setFavorites(cloudData.favorites);
              setHistory(cloudData.history);
              setWordCache(cloudData.wordCache);
              setSettings(cloudData.settings);
              if (cloudData.studyStats) {
                setStudyStats(cloudData.studyStats);
                checkDailyStreak(cloudData.studyStats);
              }
            }
          } finally {
            setIsSyncing(false);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Click Outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) setShowHistory(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Logic for Smart Mastery & Stats Update ---

  const updateWordStats = (word: string, action: 'review' | 'correct' | 'incorrect') => {
    setWordCache(prev => {
      const data = prev[word];
      if (!data) return prev;

      const stats: WordStats = data.stats || {
        reviews: 0,
        correctCount: 0,
        incorrectCount: 0,
        masteryScore: 0,
        lastReviewed: 0
      };

      const newStats = { ...stats, lastReviewed: Date.now() };

      if (action === 'review') {
        newStats.reviews += 1;
        newStats.masteryScore = Math.min(100, stats.masteryScore + 5);
      } else if (action === 'correct') {
        newStats.reviews += 1;
        newStats.correctCount += 1;
        newStats.masteryScore = Math.min(100, stats.masteryScore + 15);
      } else if (action === 'incorrect') {
        newStats.reviews += 1;
        newStats.incorrectCount += 1;
        newStats.masteryScore = Math.max(0, stats.masteryScore - 10);
      }

      const updatedWord = { ...data, stats: newStats };

      // Also update favorites if it exists there
      setFavorites(currFavs => currFavs.map(f => f.word === word ? updatedWord : f));

      return { ...prev, [word]: updatedWord };
    });
  };

  const getReviewCandidate = (): GREWordData | null => {
    // Prioritize favorites, then all cached words
    const pool = favorites.length > 0 ? favorites : Object.values(wordCache);
    if (pool.length === 0) return null;

    // Sort by mastery score (ascending) and time since last review (ascending)
    // We want low mastery + not reviewed recently
    const sorted = [...pool].sort((a, b) => {
      const masteryA = a.stats?.masteryScore || 0;
      const masteryB = b.stats?.masteryScore || 0;
      return masteryA - masteryB;
    });

    // Pick top 1
    return sorted[0];
  };

  // --- Actions ---

  const performCloudSync = async (currentUser: User, isLogin: boolean = false) => {
    setIsSyncing(true);
    try {
      const cloudData = await authService.fetchUserData(currentUser.id);
      if (cloudData && isLogin) {
        setFavorites(prev => {
          const combined = [...prev, ...cloudData.favorites];
          return Array.from(new Map(combined.map(item => [item.word, item])).values());
        });
        setHistory(prev => Array.from(new Set([...prev, ...cloudData.history])).slice(0, 20));
        setWordCache(prev => ({ ...prev, ...cloudData.wordCache }));
        setSettings(cloudData.settings); 
        if (cloudData.studyStats) {
           setStudyStats(cloudData.studyStats);
           checkDailyStreak(cloudData.studyStats);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    performCloudSync(loggedInUser, true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setShowUserMenu(false);
  };

  const handleSearch = async (term: string) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;
    setShowHistory(false); 

    const lowerTerm = cleanTerm.toLowerCase();
    const cachedKey = Object.keys(wordCache).find(k => k.toLowerCase() === lowerTerm);
    
    if (cachedKey) {
      const cachedData = wordCache[cachedKey];
      if (currentWord?.word.toLowerCase() === lowerTerm) return;

      setPreviousWord(currentWord);
      setCurrentWord(null); 
      // Simulate quick load
      setTimeout(() => {
        setCurrentWord(cachedData);
        setPreviousWord(null);
        setQuery('');
        setViewMode(ViewMode.SEARCH);
        setHistory(prev => [cachedData.word, ...prev.filter(w => w !== cachedData.word)].slice(0, 20));
      }, 50);
      return;
    }

    // Logic for Review-While-Waiting
    const candidate = getReviewCandidate();
    setReviewCandidate(candidate);

    setLoading(true);
    setError(null);
    setPreviousWord(currentWord);
    setCurrentWord(null);
    setViewMode(ViewMode.SEARCH);

    try {
      const data = await fetchWordData(cleanTerm);
      setCurrentWord(data);
      setWordCache(prev => ({ ...prev, [data.word]: data }));
      setHistory(prev => [data.word, ...prev.filter(w => w !== data.word)].slice(0, 20));
      setPreviousWord(null);
      setQuery('');
    } catch (err) {
      setError("Could not find word. Please try again.");
      setCurrentWord(previousWord);
      setPreviousWord(null);
    } finally {
      setLoading(false);
      setReviewCandidate(null);
    }
  };

  const handleRandomWord = async () => {
    // Show review while waiting for random word too
    const candidate = getReviewCandidate();
    setReviewCandidate(candidate);
    
    setLoading(true);
    setViewMode(ViewMode.SEARCH);
    setCurrentWord(null);
    try {
      const word = await fetchRandomGREWord(Object.keys(wordCache));
      await handleSearch(word);
    } catch (e) {
      setError("Failed to fetch random word.");
      setLoading(false);
      setReviewCandidate(null);
    }
  };

  const handleExportData = () => {
    const data: UserData = { favorites, history, settings, wordCache, studyStats };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gre_insight_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as UserData;
        if (parsed.favorites) setFavorites(parsed.favorites);
        if (parsed.history) setHistory(parsed.history);
        if (parsed.wordCache) setWordCache(parsed.wordCache);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.studyStats) setStudyStats(parsed.studyStats);
        alert("Data imported successfully!");
        setShowSettings(false);
      } catch (err) {
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
  };

  const toggleFavorite = (word: GREWordData) => {
    setFavorites(prev => {
      const exists = prev.some(w => w.word === word.word);
      if (exists) return prev.filter(w => w.word !== word.word);
      return [word, ...prev];
    });
  };

  const isFav = (word: string) => favorites.some(f => f.word === word);
  const toggleTheme = () => setSettings(s => ({ ...s, darkMode: !s.darkMode }));
  const toggleFont = () => setSettings(s => ({ ...s, serifFont: !s.serifFont }));
  const fontClass = settings.serifFont ? 'font-serif' : 'font-sans';
  const toggleWordBook = () => setViewMode(v => v === ViewMode.WORD_BOOK ? ViewMode.HOME : ViewMode.WORD_BOOK);

  // Navigation Helper
  const goHome = () => {
    setViewMode(ViewMode.HOME);
    setCurrentWord(null);
    setQuery('');
  };

  // Helper for Sorting Word Book
  const getSortedFavorites = () => {
    const sorted = [...favorites];
    if (sortMode === 'TIME') {
      return sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Newest first
    } else {
      // Sort by mastery (lowest first to prioritize learning)
      return sorted.sort((a, b) => (a.stats?.masteryScore || 0) - (b.stats?.masteryScore || 0));
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${settings.darkMode ? 'dark' : ''} bg-stone-50 dark:bg-stone-900 transition-colors duration-300`}>
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-stone-50/80 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* LEFT: Logo or Back Button */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={goHome}>
            {viewMode !== ViewMode.HOME ? (
               <button className="flex items-center gap-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                 <ArrowLeftIcon className="w-5 h-5" />
                 <span className="hidden sm:inline text-sm font-medium">Back</span>
               </button>
            ) : (
              <>
                <div className="w-8 h-8 bg-stone-800 dark:bg-stone-100 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white dark:text-stone-900 font-serif font-bold text-xl">G</span>
                </div>
                <span className="font-semibold text-stone-800 dark:text-stone-100 hidden sm:block tracking-tight">GRE Insight</span>
              </>
            )}
          </div>

          {/* CENTER: Search Bar */}
          <div className="flex-1 max-w-md relative flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                placeholder="Search GRE vocabulary..."
                className="w-full bg-stone-200/50 dark:bg-stone-800 border-none rounded-xl py-2 pl-9 pr-4 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-stone-400 transition-all placeholder-stone-400 text-sm"
              />
              <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            </div>
            
            <div className="relative" ref={historyDropdownRef}>
              <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-stone-200 dark:bg-stone-700' : 'text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'}`}>
                <ClockIcon className="w-5 h-5" />
              </button>
              {showHistory && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 py-2 overflow-hidden z-50 animate-fade-in-down">
                  <div className="max-h-64 overflow-y-auto no-scrollbar">
                    {history.length === 0 ? <div className="px-4 py-3 text-sm text-stone-400 italic">No history</div> : history.map((h, i) => (
                      <button key={`${h}-${i}`} onClick={() => handleSearch(h)} className="w-full text-left px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/50 flex justify-between group">
                        <span className="font-medium truncate">{h}</span>
                        <ArrowLeftIcon className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 -rotate-180" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={toggleWordBook} className={`p-2 rounded-lg transition-colors hidden sm:block ${viewMode === ViewMode.WORD_BOOK ? 'text-amber-500 bg-amber-50 dark:bg-stone-800' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'}`}>
              <BookIcon className="w-6 h-6" />
            </button>
            
            <button onClick={() => setViewMode(ViewMode.FLASHCARDS)} className="p-2 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors hidden sm:block">
              <CardStackIcon className="w-6 h-6" />
            </button>
            
            <button onClick={() => setShowSettings(true)} className="p-2 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors">
              <SettingsIcon className="w-6 h-6" />
            </button>

             <div className="relative ml-1" ref={userMenuRef}>
               {user ? (
                 <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-stone-100 dark:bg-stone-800 hover:ring-2 ring-stone-200 dark:ring-stone-700 transition-all border border-stone-200 dark:border-stone-700">
                   <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{user.name[0].toUpperCase()}</div>
                   {isSyncing && <SpinnerIcon className="w-3 h-3 text-stone-400" />}
                 </button>
               ) : (
                 <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors">
                   <UserIcon className="w-4 h-4" />
                 </button>
               )}
               {showUserMenu && user && (
                 <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 py-1 z-50 animate-fade-in-down">
                    <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{user.name}</p>
                      <p className="text-xs text-stone-500 truncate">{user.email}</p>
                    </div>
                    <div className="px-4 py-2 flex items-center gap-2 text-xs text-stone-500">
                       <CloudIcon className={`w-3 h-3 ${isSyncing ? 'animate-pulse text-blue-500' : 'text-green-500'}`} />
                       {isSyncing ? 'Syncing...' : 'Local Cloud Ready'}
                    </div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><LogoutIcon className="w-4 h-4" /> Sign Out</button>
                 </div>
               )}
             </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-8 pb-12 relative min-h-[calc(100vh-4rem)]">
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-center border border-red-100">{error}</div>}
        
        {loading && reviewCandidate ? (
          <LoadingReview reviewWord={reviewCandidate} />
        ) : loading ? (
          <WordSkeleton />
        ) : null}

        {/* HOME DASHBOARD */}
        {viewMode === ViewMode.HOME && !loading && (
          <div className="animate-fade-in space-y-12 mt-4 md:mt-8">
            
            {/* Hero Section */}
            <div className="text-center space-y-6">
               <div className="inline-block p-6 rounded-3xl bg-white dark:bg-stone-800 shadow-sm border border-stone-100 dark:border-stone-700 mb-2">
                  <span className="text-6xl">🎓</span>
               </div>
               <h2 className="text-3xl md:text-4xl font-serif text-stone-800 dark:text-stone-100 font-bold">Master GRE Vocabulary</h2>
               <p className="text-stone-500 max-w-md mx-auto leading-relaxed">
                 Enter a word above to generate structured analysis, etymology, and memory aids powered by AI.
               </p>
               
               <button 
                 onClick={handleRandomWord}
                 className="mt-6 px-8 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-stone-600 dark:text-stone-300 flex items-center gap-3 mx-auto font-medium group"
               >
                 <DiceIcon className="w-5 h-5 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" /> 
                 <span>Surprise Me</span>
               </button>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              
              {/* Analyzer Card */}
              <div 
                onClick={() => setViewMode(ViewMode.ANALYZER)}
                className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer group"
              >
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl w-fit mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                   <BeakerIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Text Analyzer</h3>
                <p className="text-sm text-stone-500">Scan articles to identify and learn high-frequency GRE words instantly.</p>
              </div>

              {/* Quiz Card */}
              <div 
                onClick={() => setViewMode(ViewMode.QUIZ)}
                className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-xl hover:border-amber-200 dark:hover:border-amber-900 transition-all cursor-pointer group"
              >
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl w-fit mb-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                   <LightningIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Daily Quiz</h3>
                <p className="text-sm text-stone-500">Test your retention with gamified quizzes based on your word book.</p>
              </div>

              {/* Stats Card */}
              <div 
                onClick={() => setShowStats(true)}
                className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900 transition-all cursor-pointer group"
              >
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl w-fit mb-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                   <ChartIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">My Progress</h3>
                <p className="text-sm text-stone-500">Track your learning streak, total words learned, and mastery level.</p>
              </div>

            </div>
          </div>
        )}

        {/* SEARCH RESULT */}
        {viewMode === ViewMode.SEARCH && !loading && currentWord && (
          <WordCard 
            data={currentWord} 
            isFavorite={isFav(currentWord.word)}
            onToggleFavorite={() => toggleFavorite(currentWord)}
            fontClass={fontClass}
          />
        )}

        {/* WORD BOOK */}
        {viewMode === ViewMode.WORD_BOOK && (
          <div className="pb-24 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-baseline gap-3">
                 <h2 className={`text-3xl font-bold text-stone-800 dark:text-stone-100 ${fontClass}`}>Word Book</h2>
                 <span className="text-stone-500 bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full text-sm font-medium">{favorites.length} words</span>
              </div>
              
              {/* Sorting Toggle */}
              {favorites.length > 0 && (
                <button 
                  onClick={() => setSortMode(s => s === 'TIME' ? 'MASTERY' : 'TIME')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                >
                  <SortIcon className="w-4 h-4" />
                  <span>Sort: {sortMode === 'TIME' ? 'Date Added' : 'Proficiency'}</span>
                </button>
              )}
            </div>
            
            {favorites.length === 0 ? (
               <div className="text-center py-20 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700">
                 <p className="text-stone-400 mb-2">Your Word Book is empty.</p>
                 <p className="text-stone-500 text-sm">Star words in search results to add them here.</p>
               </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getSortedFavorites().map((fav) => {
                  const score = fav.stats?.masteryScore || 0;
                  let color = "bg-stone-300 dark:bg-stone-600";
                  if (score > 80) color = "bg-green-500";
                  else if (score > 50) color = "bg-indigo-500";
                  else if (score > 20) color = "bg-amber-500";

                  return (
                    <div key={fav.word} onClick={() => { setCurrentWord(fav); setViewMode(ViewMode.SEARCH); }} className="cursor-pointer bg-white dark:bg-stone-800 p-5 rounded-xl border border-stone-200 dark:border-stone-700 hover:shadow-md transition-all hover:border-stone-400 dark:hover:border-stone-500 group relative">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className={`text-xl font-bold text-stone-800 dark:text-stone-100 ${fontClass}`}>{fav.word}</h3>
                         <button onClick={(e) => { e.stopPropagation(); toggleFavorite(fav); }} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110" title="Remove"><CloseIcon className="w-4 h-4" /></button>
                      </div>
                      <p className="text-sm text-stone-600 dark:text-stone-400 truncate mb-4">{fav.definition}</p>
                      
                      {/* Detailed Mastery Bar */}
                      <div className="mt-auto">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-stone-400 font-mono bg-stone-50 dark:bg-stone-900/50 px-1.5 py-0.5 rounded">{fav.partOfSpeech}</span>
                          <span className="text-xs text-stone-400 font-mono">{score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-700/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${color}`} 
                            style={{ width: `${score}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TOOLS VIEWS */}
        {viewMode === ViewMode.ANALYZER && (
           <TextAnalyzer 
             onWordClick={handleSearch} 
             onBack={goHome} 
             fontClass={fontClass} 
           />
        )}

        {viewMode === ViewMode.QUIZ && (
           <Quiz 
             wordCache={wordCache} 
             onBack={goHome} 
             fontClass={fontClass} 
             onResult={updateWordStats}
           />
        )}

        {viewMode === ViewMode.FLASHCARDS && (
          <Flashcards 
             words={favorites} 
             onClose={() => setViewMode(ViewMode.HOME)} 
             fontClass={fontClass} 
             onReview={(word) => updateWordStats(word, 'review')}
          />
        )}

      </main>

      {/* MODALS */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-stone-100 dark:border-stone-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-stone-600"><CloseIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2">
                <span className="text-stone-700 dark:text-stone-300 font-medium">Dark Mode</span>
                <button onClick={toggleTheme} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${settings.darkMode ? 'bg-stone-700' : 'bg-stone-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-300 ${settings.darkMode ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              <div className="flex justify-between items-center p-2">
                <span className="text-stone-700 dark:text-stone-300 font-medium">Serif Font</span>
                <button onClick={toggleFont} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${settings.serifFont ? 'bg-stone-700' : 'bg-stone-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-300 ${settings.serifFont ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              
              <div className="border-t border-stone-100 dark:border-stone-700 pt-4 mt-2">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Data Management</p>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={handleExportData} className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-600 dark:text-stone-400 gap-2">
                      <DownloadIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">Backup</span>
                   </button>
                   <label className="flex flex-col items-center justify-center p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-600 dark:text-stone-400 gap-2 cursor-pointer">
                      <UploadIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">Restore</span>
                      <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                   </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} />}
      
      {showStats && (
        <StatsModal 
           data={{ favorites, history, settings, wordCache, studyStats }} 
           onClose={() => setShowStats(false)} 
        />
      )}

    </div>
  );
}