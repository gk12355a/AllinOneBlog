import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Layers,
  ChevronRight,
  BookOpen,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  TrendingUp,
  Tag,
  ArrowRight,
  Award
} from 'lucide-react';
import api from '../../services/api';
import { useApp } from '../../contexts/AppContext';

export default function SeriesList() {
  const { lang, t, user } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seriesList, setSeriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all'); // all, beginner, intermediate, advanced

  // Track user reading history from localStorage
  const [readPosts, setReadPosts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('read_posts_list') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setIsLoading(true);
    api.get('/series')
      .then((res) => {
        const data = res?.data || res;
        setSeriesList(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Enhance each series with level & status (Use admin explicit setting if present, otherwise calculate fallback)
  const enrichedSeries = seriesList.map((s) => {
    const totalPosts = s.total_posts || 0;
    const status = s.status || (totalPosts >= 5 ? 'completed' : totalPosts > 0 ? 'updating' : 'upcoming');
    const level = s.level || (
      s.title.toLowerCase().includes('a-z') || s.title.toLowerCase().includes('cơ bản')
        ? 'beginner'
        : s.title.toLowerCase().includes('nâng cao') || s.title.toLowerCase().includes('architecture')
        ? 'advanced'
        : 'intermediate'
    );

    return {
      ...s,
      calculatedStatus: status,
      calculatedLevel: level,
      total_reading_time: s.total_reading_time || (totalPosts * 6)
    };
  });

  const filteredSeries = enrichedSeries.filter((s) => {
    const matchesSearch =
      !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.tags && s.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesLevel = selectedLevel === 'all' || s.calculatedLevel === selectedLevel;

    return matchesSearch && matchesLevel;
  });

  const isSingle = filteredSeries.length === 1;

  return (
    <div className="space-y-10 py-10 animate-fade-in min-h-[calc(100vh-14rem)] flex flex-col justify-start">
      {/* 1. Header Section */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight text-balance">
          {t('series.title')}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-300 text-sm sm:text-base leading-relaxed max-w-3xl">
          {t('series.subtitle')}
        </p>
      </div>

      {/* 2. Structured Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm backdrop-blur-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('series.search_placeholder')}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 text-sm outline-none focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Level Filters */}
        <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 text-xs font-semibold shrink-0">
          {[
            { id: 'all', label: t('series.all_levels') },
            { id: 'beginner', label: t('series.level_beginner') },
            { id: 'intermediate', label: t('series.level_intermediate') },
            { id: 'advanced', label: t('series.level_advanced') }
          ].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setSelectedLevel(lvl.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedLevel === lvl.id
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Series Presentation */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-zinc-200/70 dark:bg-zinc-850 animate-pulse"></div>
          ))}
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 space-y-3">
          <Layers className="w-12 h-12 mx-auto text-zinc-400 stroke-1" />
          <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            {t('series.empty')}
          </p>
        </div>
      ) : isSingle ? (
        /* Full-Width Horizontal Featured Card when only 1 series exists to avoid blank half */
        <div className="w-full">
          {filteredSeries.map((s) => (
            <Link
              key={s.id}
              to={`/series/${s.slug}`}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/60 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col lg:flex-row"
            >
              <div className="lg:w-5/12 h-64 sm:h-80 overflow-hidden relative bg-zinc-900">
                <img
                  src={s.cover_image || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop&q=80'}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Brand blue/indigo gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-blue-900/20 pointer-events-none"></div>

                {/* Status Badge */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  <span>{t(`series.status_${s.calculatedStatus}`)}</span>
                </div>

                {/* Level Badge */}
                <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-zinc-200 text-xs font-semibold border border-white/10 shadow-md">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t(`series.level_${s.calculatedLevel}`)}</span>
                </div>
              </div>

              <div className="lg:w-7/12 p-6 sm:p-8 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 flex-wrap">
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                      <BookOpen className="w-4 h-4" />
                      {s.total_posts} {t('series.posts_count')}
                    </span>
                    {s.total_videos > 0 && (
                      <span className="flex items-center gap-1">
                        • {s.total_videos} {t('series.videos_count')}
                      </span>
                    )}
                    {s.total_reading_time > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        ~{s.total_reading_time} {t('blog.reading_time')}
                      </span>
                    )}
                    {s.updated_at && (
                      <span className="text-zinc-400">
                        • {t('blog.reading_time') ? 'Cập nhật' : 'Updated'}: {formatDate(s.updated_at)}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                    {s.title}
                  </h2>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {s.description || 'Lộ trình bài viết được cấu trúc tỉ mỉ từ cơ bản đến nâng cao.'}
                  </p>

                  {/* Tech stack tags */}
                  {s.tags && s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {s.tags.slice(0, 5).map((tg, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-mono font-medium border border-zinc-200/50 dark:border-zinc-700/50"
                        >
                          #{tg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Lộ trình hoàn chỉnh chuẩn Clean Architecture</span>
                  </div>

                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
                    <span>{t('series.explore_roadmap')}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Multi-column Grid when there are 2 or more series */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSeries.map((s) => (
            <Link
              key={s.id}
              to={`/series/${s.slug}`}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full"
            >
              <div className="h-48 overflow-hidden bg-zinc-900 relative">
                <img
                  src={s.cover_image || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80'}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  <span>{t(`series.status_${s.calculatedStatus}`)}</span>
                </div>

                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-zinc-200 text-[11px] font-semibold border border-white/10 shadow-md">
                  {t(`series.level_${s.calculatedLevel}`)}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                      <BookOpen className="w-3.5 h-3.5" />
                      {s.total_posts} {t('series.posts_count')}
                    </span>
                    {s.total_videos > 0 && <span>• {s.total_videos} videos</span>}
                    {s.total_reading_time > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        ~{s.total_reading_time}m
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {s.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>{t('series.explore_roadmap')}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
