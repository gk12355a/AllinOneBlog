import React, { createContext, useContext, useState, useEffect } from 'react';
import vi from '../locales/vi.json';
import en from '../locales/en.json';

const dictionaries = { vi, en };

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // 1. Theme State (Dark / Light)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 2. Language State (VI / EN)
  const [lang, setLang] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('lang') || localStorage.getItem('lang') || 'vi';
  });

  // Reading Font Size State (small / medium / large)
  const [readingFontSize, setReadingFontSize] = useState(() => {
    const saved = localStorage.getItem('reading_font_size');
    return saved || 'medium';
  });

  useEffect(() => {
    localStorage.setItem('reading_font_size', readingFontSize);
    document.documentElement.setAttribute('data-reading-size', readingFontSize);
  }, [readingFontSize]);

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    const url = new URL(window.location);
    url.searchParams.set('lang', newLang);
    window.history.replaceState({}, '', url);
  };

  const t = (key) => {
    const keys = key.split('.');
    let val = dictionaries[lang] || dictionaries.vi;
    for (const k of keys) {
      val = val?.[k];
    }
    return val || key;
  };

  // 3. User Authentication State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const loginUser = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUserData = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
    if (merged?.settings?.reading_font_size) {
      setReadingFontSize(merged.settings.reading_font_size);
    }
  };

  // 4. Toast Notifications System
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // 5. Spotlight Modal (Ctrl+K)
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSpotlightOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      lang,
      changeLanguage,
      readingFontSize,
      setReadingFontSize,
      t,
      user,
      loginUser,
      logoutUser,
      updateUserData,
      toast,
      showToast,
      isSpotlightOpen,
      setIsSpotlightOpen
    }}>
      {children}
      {/* Toast Overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xl border border-zinc-700 dark:border-zinc-300 text-xs font-semibold animate-fade-in transition-all">
          <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></span>
          <span>{toast.message}</span>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
