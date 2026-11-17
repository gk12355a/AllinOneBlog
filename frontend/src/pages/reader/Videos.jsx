import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, Clock, Eye, Calendar, Tag, Search, 
  Video as VideoIcon, Sparkles, Filter, Layers, ArrowRight 
} from 'lucide-react';
import contentService from '../../services/contentService';
import { useApp } from '../../contexts/AppContext';

export default function Videos() {
  const { lang, t } = useApp();
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'views'

  useEffect(() => {
    setIsLoading(true);
    contentService.getVideos()
      .then(res => setVideos(res.data || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Extract YouTube ID
  const extractYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  // Distinct categories
  const categories = ['all', ...Array.from(new Set(videos.map(v => v.category).filter(Boolean)))];

  // Filtering & Sorting
  const filteredVideos = videos
    .filter(v => {
      const matchSearch = v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || v.category === selectedCategory;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === 'views') {
        return (b.view_count || 0) - (a.view_count || 0);
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  // Featured Hero Video (First video or first with featured=true)
  const featuredVideo = filteredVideos.length > 0 ? (filteredVideos.find(v => v.featured) || filteredVideos[0]) : null;
  const gridVideos = filteredVideos.filter(v => !featuredVideo || v.id !== featuredVideo.id);

  return (
    <div className="py-8 pb-16 max-w-6xl mx-auto space-y-10 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          {lang === 'vi' ? 'Video Showcase' : 'Video Showcase'}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-2xl">
          {lang === 'vi' 
            ? 'Kho lưu trữ video hướng dẫn kỹ thuật, kiến trúc hệ thống, DevOps và chia sẻ kinh nghiệm thực chiến.'
            : 'Curated technical tutorials, system architecture deep-dives, DevOps, and software engineering videos.'}
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'vi' ? 'Tìm kiếm video theo tiêu đề, từ khóa...' : 'Search videos...'}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? (lang === 'vi' ? 'Tất cả chủ đề' : 'All categories') : cat}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="newest">{lang === 'vi' ? 'Mới nhất' : 'Newest'}</option>
            <option value="views">{lang === 'vi' ? 'Xem nhiều nhất' : 'Most Viewed'}</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="h-80 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 space-y-3">
          <VideoIcon className="w-12 h-12 mx-auto stroke-1 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium">{lang === 'vi' ? 'Không có video nào phù hợp.' : 'No videos found.'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Featured Hero Card (Tránh lệch trái khi chỉ có 1 video hoặc làm điểm nhấn video mới nhất) */}
          {featuredVideo && (
            <Link
              to={`/videos/${featuredVideo.slug || featuredVideo.id}`}
              className="group block rounded-3xl overflow-hidden bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 transition-all hover:shadow-2xl"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-center">
                {/* Thumbnail Col (7 cols) */}
                <div className="lg:col-span-7 relative aspect-video overflow-hidden bg-zinc-950">
                  <img
                    src={featuredVideo.thumbnail_url || (extractYouTubeId(featuredVideo.video_url) ? `https://img.youtube.com/vi/${extractYouTubeId(featuredVideo.video_url)}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1000&q=80')}
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Play Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {featuredVideo.duration && (
                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-black/80 text-white backdrop-blur-md">
                      {featuredVideo.duration}
                    </span>
                  )}
                </div>

                {/* Info Col (5 cols) */}
                <div className="lg:col-span-5 p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                      <Sparkles className="w-3 h-3" />
                      <span>{lang === 'vi' ? 'Video Nổi Bật' : 'Featured Video'}</span>
                    </span>
                    <span className="text-xs text-zinc-400">
                      {featuredVideo.category || 'Tech'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                    {featuredVideo.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {featuredVideo.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {featuredVideo.view_count || 1}
                      </span>
                      <span>•</span>
                      <span>{featuredVideo.created_at ? new Date(featuredVideo.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : ''}</span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                      <span>{lang === 'vi' ? 'Xem ngay' : 'Watch now'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Grid for Remaining Videos (3 Columns) */}
          {gridVideos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {gridVideos.map((v) => {
                const ytId = extractYouTubeId(v.video_url);
                return (
                  <Link
                    key={v.id}
                    to={`/videos/${v.slug || v.id}`}
                    className="group flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 hover:shadow-xl transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-zinc-950">
                      <img
                        src={v.thumbnail_url || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80')}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Play hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Duration */}
                      {v.duration && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-black/80 text-white backdrop-blur-md">
                          {v.duration}
                        </span>
                      )}

                      {/* Category Badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white backdrop-blur-md">
                        {v.category || 'Tech'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                          {v.title}
                        </h3>
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                          {v.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {v.view_count || 1}
                        </span>
                        <span>{v.created_at ? new Date(v.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : ''}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
