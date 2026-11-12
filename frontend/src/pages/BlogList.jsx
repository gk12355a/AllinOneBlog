import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Clock, Tag, Eye, Heart, Search } from 'lucide-react';
import api from '../services/api';
import { useApp } from '../contexts/AppContext';

export default function BlogList() {
  const { lang, t } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentTag = searchParams.get('tag') || '';
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    // Lấy danh sách tags
    api.get('/tags').then(res => setTags(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    let url = `/posts?lang=${lang}`;
    if (currentTag) url += `&tag=${encodeURIComponent(currentTag)}`;

    api.get(url)
      .then(res => setPosts(res.data.posts))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [lang, currentTag]);

  const filteredPosts = posts.filter(p =>
    !searchKeyword.trim() ||
    p.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    p.excerpt.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="space-y-12 py-10 animate-fade-in">
      {/* Title & Tag Cloud */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Bài Viết & Chia Sẻ Kỹ Thuật
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base">
            Tổng hợp các bài viết hướng dẫn chuyên sâu về kiến trúc sạch, full-stack development và AI.
          </p>
        </div>

        {/* Search Bar & Tag Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Lọc bài viết theo tiêu đề..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSearchParams({})}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !currentTag
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              Tất cả
            </button>
            {tags.map((tObj) => (
              <button
                key={tObj.tag}
                onClick={() => setSearchParams({ tag: tObj.tag })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentTag === tObj.tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                #{tObj.tag} <span className="opacity-70">({tObj.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 rounded-2xl bg-zinc-100 dark:bg-zinc-850 animate-pulse"></div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 space-y-2">
          <BookOpen className="w-12 h-12 mx-auto stroke-1" />
          <p className="text-base font-medium">Chưa có bài viết nào trong danh mục này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all hover:shadow-xl flex flex-col"
            >
              {post.cover_image && (
                <div className="h-44 overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white font-mono text-[10px] uppercase">
                    {post.lang}
                  </span>
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {post.reading_time} {t('blog.reading_time')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {post.views}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {post.tags?.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-zinc-400 font-mono">
                    @tumivn
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
