import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, ShieldCheck, Globe, Sun, Moon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function AdminLayout() {
  const { user, logoutUser, lang, changeLanguage, theme, toggleTheme, t } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
              title={t('admin.back_to_blog')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('admin.back_to_blog')}</span>
            </Link>
            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold font-mono tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                {t('admin.admin_workspace')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher (VI / EN) */}
            <button
              onClick={() => changeLanguage(lang === 'vi' ? 'en' : 'vi')}
              className="px-2.5 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title={lang === 'vi' ? 'Chuyển sang Tiếng Anh' : 'Switch to Vietnamese'}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
              title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Admin User Info Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{user?.username}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-indigo-200/60 dark:bg-indigo-900/60 text-[10px] uppercase font-mono font-bold">
                {user?.role}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Main Body */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
}
