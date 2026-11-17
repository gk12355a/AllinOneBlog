import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Search, Globe, User, LogOut, Bookmark, ShieldCheck, Menu, X, Settings } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function Navbar() {
  const { theme, toggleTheme, lang, changeLanguage, t, user, logoutUser, setIsSpotlightOpen } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.blog'), path: '/blog' },
    { name: t('nav.series'), path: '/series' },
    { name: t('nav.certificates'), path: '/certificates' },
    { name: t('nav.videos'), path: '/videos' },
    { name: t('nav.albums'), path: '/album' },
  ];

  // Close user dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // Close menu on route navigation
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logoutUser();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-100 group">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-mono text-base shadow-md group-hover:scale-105 transition-transform">
            K
          </span>
          <span>AllinOne<span className="text-blue-600 dark:text-blue-400">Blog</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Tools: Spotlight, Language, Theme, User Auth */}
        <div className="flex items-center gap-2">
          {/* Spotlight Search Button */}
          <button
            onClick={() => setIsSpotlightOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={t('nav.search')}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'en' ? 'Search' : 'Tìm kiếm'}</span>
            <kbd className="hidden sm:inline px-1 py-0.5 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Language Switcher (VI / EN) */}
          <button
            onClick={() => changeLanguage(lang === 'vi' ? 'en' : 'vi')}
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Đổi ngôn ngữ"
          >
            <Globe className="w-4 h-4" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Account Menu / Login */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title={user.username}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {user.username.charAt(0)}
                </div>
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in text-sm">
                  <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.username}</p>
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                        user.role === 'admin'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user.email}</p>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/my-library"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                        location.pathname === '/library' || location.pathname === '/my-library'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 text-indigo-500" />
                      <span>{t('nav.library')}</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                        location.pathname.startsWith('/settings')
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Settings className="w-4 h-4 text-zinc-500" />
                      <span>{t('nav.settings') || 'Cài đặt'}</span>
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                          location.pathname.startsWith('/admin')
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>{t('nav.admin')}</span>
                      </Link>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 p-1.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left font-medium transition text-xs sm:text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>{t('nav.login')}</span>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              {link.name}
            </Link>
          ))}
          {user && (
            <Link
              to="/my-library"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              {t('nav.library')}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
