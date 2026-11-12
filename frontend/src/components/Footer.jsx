import React from 'react';
import { Heart, Rss } from 'lucide-react';
import { GithubIcon, LinkedinIcon, YoutubeIcon } from './SocialIcons';
import { useApp } from '../contexts/AppContext';

export default function Footer() {
  const { t } = useApp();

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 py-12 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Copyright */}
          <div className="text-center md:text-left">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              AllinOneBlog.dev
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Personal Portfolio & Modern Engineering Blog.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-5 text-zinc-500 dark:text-zinc-400">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <GithubIcon className="w-5 h-5" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <LinkedinIcon className="w-5 h-5" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <YoutubeIcon className="w-5 h-5" />
            </a>
            <a href="/rss.xml" target="_blank" rel="noreferrer" className="hover:text-orange-500 transition-colors" title="RSS Feed">
              <Rss className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
          <p>© {new Date().getFullYear()} AllinOneBlog. Built with React & Flask.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> & Clean Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}
