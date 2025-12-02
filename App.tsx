import React, { useState, useEffect, useRef } from 'react';
import { GREWordData, Settings, ViewMode, User, UserData } from './types';
import { fetchWordData } from './services/geminiService';
import { authService } from './services/authService';
import { WordCard } from './components/WordCard';
import { WordSkeleton } from './components/Skeleton';
import { Flashcards } from './components/Flashcards';
import { AuthModal } from './components/AuthModal';
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
  SpinnerIcon
} from './components/Icons';

export default function App() {
  // State
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentWord, setCurrentWord] = useState<GREWordData | null>(null);
  const [previousWord, setPreviousWord] = useState<GREWordData | null>(null); 
  const [error, setError] = useState<string | null>(null);
  
  // Data Persistence
  const [history, setHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<GREWordData[]>([]);
  const [wordCache, setWordCache] = useState<Record<string, GREWordData>>({});
  
  // Auth & Cloud State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SEARCH);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    serifFont: true,
    fontSize: 'medium'
  });

  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load (Local Storage & Session)
  useEffect(() => {
    // Load local data
    const savedFavs = localStorage.getItem('gre_favorites');
    const savedHist = localStorage.getItem('gre_history');
    const savedCache = localStorage.getItem('gre_cache');
    const savedSettings = localStorage.getItem('gre_settings');

    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedHist) setHistory(JSON.parse(savedHist));
    if (savedCache) setWordCache(JSON.parse(savedCache));
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
    }

    // Check for active session
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      performCloudSync(currentUser, true);
    }
  }, []);

  // 2. Persist to Local Storage (Device Storage)
  useEffect(() => { localStorage.setItem('gre_favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('gre_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('gre_cache', JSON.stringify(wordCache)); }, [wordCache]);
  useEffect(() => {
    localStorage.setItem('gre_settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // 3. Persist to Cloud (Debounced) if Logged In
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      // We only push to cloud here. 
      // Note: In a real app, we'd check if local changes are actually newer than cloud.
      setIsSyncing(true);
      const userData: UserData = {
        favorites,
        history,
        settings,
        wordCache
      };
      authService.saveUserData(user.id, userData).then(() => {
        setIsSyncing(false);
      });
    }, 2000); // 2-second debounce for cloud save

    return () => clearTimeout(timeoutId);
  }, [favorites, history, settings, wordCache, user]);

  // 4. Cross-Tab Synchronization Listener
  useEffect(() => {
    const unsubscribe = authService.onSyncEvent(async (event) => {
      console.log("[Sync] Received event:", event.type);
      
      if (event.type === 'LOGOUT') {
        setUser(null);
        setShowUserMenu(false);
        // Optional: clear local state or revert to default
        return;
      }

      if (event.type === 'LOGIN' || event.type === 'DATA_UPDATE') {
        // If login happened in another tab, update current user
        const currentUser = authService.getCurrentUser();
        if (currentUser && (!user || user.id !== currentUser.id)) {
           setUser(currentUser);
        }

        // Pull latest data
        if (currentUser) {
          setIsSyncing(true);
          try {
            const cloudData = await authService.fetchUserData(currentUser.id);
            if (cloudData) {
              // Hard sync from cloud (other tab is source of truth)
              setFavorites(cloudData.favorites);
              setHistory(cloudData.history);
              setWordCache(cloudData.wordCache);
              setSettings(cloudData.settings);
            }
          } finally {
            setIsSyncing(false);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Click Outside Handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Auth & Sync Logic ---

  const performCloudSync = async (currentUser: User, isLogin: boolean = false) => {
    setIsSyncing(true);
    try {
      const cloudData = await authService.fetchUserData(currentUser.id);
      
      if (cloudData) {
        if (isLogin) {
            // On Login: Intelligent Merge
            setFavorites(prev => {
                const combined = [...prev, ...cloudData.favorites];
                const unique = Array.from(new Map(combined.map(item => [item.word, item])).values());
                return unique;
            });
            setHistory(prev => Array.from(new Set([...prev, ...cloudData.history])).slice(0, 20));
            setWordCache(prev => ({ ...prev, ...cloudData.wordCache }));
            setSettings(cloudData.settings); 
        } else {
            // Passive pull (handled by BroadcastChannel mostly)
        }
      }
    } catch (e) {
      console.error("Sync failed", e);
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

  // --- Search Logic ---

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
      
      setTimeout(() => {
        setCurrentWord(cachedData);
        setPreviousWord(null);
        setQuery('');
        setViewMode(ViewMode.SEARCH);
        // Update history
        setHistory(prev => {
           const newHist = [cachedData.word, ...prev.filter(w => w !== cachedData.word)].slice(0, 20);
           return newHist;
        });
      }, 50);
      return;
    }

    setLoading(true);
    setError(null);
    setPreviousWord(currentWord);
    setCurrentWord(null);

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
    }
  };

  const toggleFavorite = (word: GREWordData) => {
    setFavorites(prev => {
      const exists = prev.some(w => w.word === word.word);
      if (exists) return prev.filter(w => w.word !== word.word);
      return [word, ...prev];
    });
  };

  const isFav = (word: string) => favorites.some(f => f.word === word);

  // Settings Toggles
  const toggleTheme = () => setSettings(s => ({ ...s, darkMode: !s.darkMode }));
  const toggleFont = () => setSettings(s => ({ ...s, serifFont: !s.serifFont }));
  const fontClass = settings.serifFont ? 'font-serif' : 'font-sans';

  const toggleWordBook = () => {
    if (viewMode === ViewMode.WORD_BOOK) {
      setViewMode(ViewMode.SEARCH);
    } else {
      setViewMode(ViewMode.WORD_BOOK);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${settings.darkMode ? 'dark' : ''} bg-stone-50 dark:bg-stone-900 transition-colors duration-300`}>
      
      {/* 1. Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-stone-50/80 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer shrink-0" 
            onClick={() => { setViewMode(ViewMode.SEARCH); setCurrentWord(null); }}
          >
            <div className="w-8 h-8 bg-stone-800 dark:bg-stone-100 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white dark:text-stone-900 font-serif font-bold text-xl">G</span>
            </div>
            <span className="font-semibold text-stone-800 dark:text-stone-100 hidden sm:block tracking-tight">GRE Insight</span>
          </div>

          {/* Search Input Area */}
          <div className="flex-1 max-w-md relative flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                placeholder="Search..."
                className="w-full bg-stone-200/50 dark:bg-stone-800 border-none rounded-xl py-2 pl-9 pr-4 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-stone-400 transition-all placeholder-stone-400 text-sm"
              />
              <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            </div>
            
            <div className="relative" ref={historyDropdownRef}>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-100' : 'text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'}`}
              >
                <ClockIcon className="w-5 h-5" />
              </button>

              {showHistory && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 py-2 overflow-hidden z-50 animate-fade-in-down">
                  <div className="px-4 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-700 mb-1">
                    Recent
                  </div>
                  <div className="max-h-64 overflow-y-auto no-scrollbar">
                    {history.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-stone-400 italic">No history</div>
                    ) : (
                      history.map((h, i) => (
                        <button
                          key={`${h}-${i}`}
                          onClick={() => handleSearch(h)}
                          className="w-full text-left px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex justify-between items-center group"
                        >
                          <span className="font-medium truncate">{h}</span>
                          <ArrowLeftIcon className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 -rotate-180 shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
             {/* Word Book */}
            <button 
              onClick={toggleWordBook} 
              className={`p-2 rounded-lg transition-colors hidden sm:block ${viewMode === ViewMode.WORD_BOOK ? 'text-amber-500 bg-amber-50 dark:bg-stone-800' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'}`}
              title="Word Book"
            >
              <BookIcon className="w-6 h-6" />
            </button>
            
            {/* Flashcards */}
            <button 
              onClick={() => setViewMode(ViewMode.FLASHCARDS)} 
              className="p-2 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors hidden sm:block"
              title="Flashcards"
            >
              <CardStackIcon className="w-6 h-6" />
            </button>
            
            {/* Settings */}
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>

             {/* User Profile / Login */}
             <div className="relative ml-1" ref={userMenuRef}>
               {user ? (
                 <button 
                   onClick={() => setShowUserMenu(!showUserMenu)}
                   className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-stone-100 dark:bg-stone-800 hover:ring-2 ring-stone-200 dark:ring-stone-700 transition-all border border-stone-200 dark:border-stone-700"
                 >
                   <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                     {user.name[0].toUpperCase()}
                   </div>
                   {isSyncing && <SpinnerIcon className="w-3 h-3 text-stone-400" />}
                 </button>
               ) : (
                 <button 
                   onClick={() => setShowAuthModal(true)}
                   className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
                 >
                   <UserIcon className="w-4 h-4" />
                   <span className="hidden sm:inline">Login</span>
                 </button>
               )}

               {/* User Dropdown */}
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
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                    >
                      <LogoutIcon className="w-4 h-4" />
                      Sign Out
                    </button>
                 </div>
               )}
             </div>

          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-8 pb-12 relative min-h-[calc(100vh-4rem)]">
        
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        {/* LOADING STATE */}
        {loading && <WordSkeleton />}

        {/* SEARCH MODE Display */}
        {viewMode === ViewMode.SEARCH && !loading && currentWord && (
          <WordCard 
            data={currentWord} 
            isFavorite={isFav(currentWord.word)}
            onToggleFavorite={() => toggleFavorite(currentWord)}
            fontClass={fontClass}
          />
        )}

        {/* EMPTY STATE (Welcome) */}
        {viewMode === ViewMode.SEARCH && !loading && !currentWord && (
          <div className="text-center mt-20 md:mt-32 space-y-6 opacity-60 animate-fade-in">
             <div className="inline-block p-6 rounded-3xl bg-white dark:bg-stone-800 shadow-sm mb-4">
                <span className="text-6xl">🎓</span>
             </div>
             <h2 className="text-2xl font-serif text-stone-700 dark:text-stone-300">Master GRE Vocabulary</h2>
             <p className="text-stone-500 max-w-sm mx-auto">
               Enter a word to generate structured analysis, etymology, and memory aids powered by AI.
             </p>
          </div>
        )}

        {/* WORD BOOK MODE */}
        {viewMode === ViewMode.WORD_BOOK && (
          <div className="pb-24 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setViewMode(ViewMode.SEARCH)}
                  className="p-2 -ml-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors text-stone-500"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <h2 className={`text-3xl font-bold text-stone-800 dark:text-stone-100 ${fontClass}`}>Word Book</h2>
              </div>
              <span className="text-stone-500 bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full text-sm font-medium">
                {favorites.length} words
              </span>
            </div>
            
            {favorites.length === 0 ? (
               <div className="text-center py-20 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700">
                 <p className="text-stone-400 mb-2">Your Word Book is empty.</p>
                 <p className="text-stone-500 text-sm">Star words in search results to add them here.</p>
               </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {favorites.map((fav) => (
                  <div 
                    key={fav.word} 
                    onClick={() => { setCurrentWord(fav); setViewMode(ViewMode.SEARCH); }}
                    className="cursor-pointer bg-white dark:bg-stone-800 p-5 rounded-xl border border-stone-200 dark:border-stone-700 hover:shadow-md transition-all hover:border-stone-400 dark:hover:border-stone-500 group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <h3 className={`text-xl font-bold text-stone-800 dark:text-stone-100 ${fontClass}`}>{fav.word}</h3>
                       <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(fav); }}
                        className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        title="Remove"
                       >
                         <CloseIcon className="w-4 h-4" />
                       </button>
                    </div>
                    <p className="text-sm text-stone-600 dark:text-stone-400 truncate mb-1">{fav.definition}</p>
                    <p className="text-xs text-stone-400 font-mono bg-stone-50 dark:bg-stone-900/50 inline-block px-1.5 py-0.5 rounded">{fav.partOfSpeech}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-stone-100 dark:border-stone-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Appearance</h3>
              <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-stone-600"><CloseIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors">
                <span className="text-stone-700 dark:text-stone-300 font-medium">Dark Mode</span>
                <button 
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${settings.darkMode ? 'bg-stone-700' : 'bg-stone-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-300 ${settings.darkMode ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors">
                <span className="text-stone-700 dark:text-stone-300 font-medium">Serif Font</span>
                <button 
                  onClick={toggleFont}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${settings.serifFont ? 'bg-stone-700' : 'bg-stone-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-300 ${settings.serifFont ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 5. Flashcards Modal Overlay */}
      {viewMode === ViewMode.FLASHCARDS && (
        <Flashcards 
          words={favorites} 
          onClose={() => setViewMode(ViewMode.SEARCH)} 
          fontClass={fontClass}
        />
      )}

    </div>
  );
}