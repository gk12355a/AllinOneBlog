import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, FolderGit2, Video, Image, X } from 'lucide-react';
import api from '../services/api';
import { useApp } from '../contexts/AppContext';

export default function SpotlightModal() {
  const { isSpotlightOpen, setIsSpotlightOpen, t } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ posts: [], projects: [], videos: [], albums: [] });
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSpotlightOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ posts: [], projects: [], videos: [], albums: [] });
    }
  }, [isSpotlightOpen]);

  // Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSpotlightOpen) {
        e.preventDefault();
        setIsSpotlightOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpotlightOpen, setIsSpotlightOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ posts: [], projects: [], videos: [], albums: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isSpotlightOpen) return null;

  const handleSelect = (url) => {
    setIsSpotlightOpen(false);
    navigate(url);
  };

  const hasResults = results.posts.length > 0 || results.projects.length > 0 || results.videos.length > 0 || results.albums.length > 0;

  return (
    <div 
      onClick={() => setIsSpotlightOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="w-5 h-5 text-zinc-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm bài viết, dự án, video, album... (nhấn ESC để thoát)"
            className="flex-1 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none text-base"
          />
          <button
            onClick={() => setIsSpotlightOpen(false)}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="text-center py-6 text-zinc-400 text-sm">Đang tìm kiếm...</div>
          )}

          {!isLoading && query && !hasResults && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              Không tìm thấy kết quả nào phù hợp với "<span className="font-medium text-zinc-700 dark:text-zinc-200">{query}</span>"
            </div>
          )}

          {/* Posts */}
          {results.posts.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-zinc-400 px-2 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Bài Viết ({results.posts.length})
              </div>
              <div className="space-y-1">
                {results.posts.map(post => (
                  <button
                    key={post.id}
                    onClick={() => handleSelect(`/blog/${post.slug}`)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">
                        {post.title}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {post.excerpt}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-zinc-400 px-2 mb-2 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5" /> Dự Án ({results.projects.length})
              </div>
              <div className="space-y-1">
                {results.projects.map(proj => (
                  <button
                    key={proj.id}
                    onClick={() => handleSelect(`/#projects`)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500">
                        {proj.title}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {proj.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {results.videos.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-zinc-400 px-2 mb-2 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" /> Videos ({results.videos.length})
              </div>
              <div className="space-y-1">
                {results.videos.map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleSelect(`/videos`)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center justify-between group transition-colors"
                  >
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500">
                      {v.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {results.albums.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-zinc-400 px-2 mb-2 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" /> Albums ({results.albums.length})
              </div>
              <div className="space-y-1">
                {results.albums.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(`/album/${a.slug}`)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center justify-between group transition-colors"
                  >
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500">
                      {a.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Nhấn <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">ESC</kbd> để đóng</span>
          <span>Hỗ trợ tìm kiếm theo từ khóa có dấu / không dấu</span>
        </div>
      </div>
    </div>
  );
}
