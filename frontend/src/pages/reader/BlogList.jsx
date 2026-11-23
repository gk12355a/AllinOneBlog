import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Clock, Tag, Eye, Search, Sparkles, Calendar, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import Pagination from '../../components/common/Pagination';

export default function BlogList() {
  const { lang, t } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllTags, setShowAllTags] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });

  const currentTag = (searchParams.get('tag') || '').toLowerCase();
  const currentLangFilter = searchParams.get('lang') || 'all'; // 'all', 'vi', 'en'
  const currentSort = searchParams.get('sort') || 'newest'; // 'newest', 'popular'
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    // Lấy danh sách tags đã chuẩn hóa
    api.get('/tags').then((res) => {
      const data = res?.data || res;
      setTags(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: currentPage,
      limit: 6, // 6 bài viết mỗi trang
      sort: currentSort
    });

    if (currentLangFilter && currentLangFilter !== 'all') {
      params.append('lang', currentLangFilter);
    }
    if (currentTag) {
      params.append('tag', currentTag);
    }

    api
      .get(`/posts?${params.toString()}`)
      .then((res) => {
        const data = res?.data || res;
        setPosts(data.posts || []);
        setPagination({
          page: data.page || 1,
          pages: data.pages || 1,
          total: data.total || 0
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentLangFilter, currentTag, currentSort, currentPage]);

  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newPage > 1) {
      nextParams.set('page', newPage);
    } else {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagClick = (tag) => {
    const nextParams = new URLSearchParams(searchParams);
    const normalizedTag = (tag || '').toLowerCase();
    if (normalizedTag && normalizedTag !== currentTag) {
      nextParams.set('tag', normalizedTag);
    } else {
      nextParams.delete('tag');
    }
    nextParams.delete('page'); // Reset về trang 1
    setSearchParams(nextParams);
  };

  const handleLangFilterChange = (filterVal) => {
    const nextParams = new URLSearchParams(searchParams);
    if (filterVal && filterVal !== 'all') {
      nextParams.set('lang', filterVal);
    } else {
      nextParams.delete('lang');
    }
    nextParams.delete('page'); // Reset về trang 1
    setSearchParams(nextParams);
  };

  const handleSortChange = (sortVal) => {
    const nextParams = new URLSearchParams(searchParams);
    if (sortVal && sortVal !== 'newest') {
      nextParams.set('sort', sortVal);
    } else {
      nextParams.delete('sort');
    }
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchKeyword('');
  };

  const filteredPosts = posts.filter(
    (p) =>
      !searchKeyword.trim() ||
      p.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (p.excerpt && p.excerpt.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  const visibleTags = showAllTags ? tags : tags.slice(0, 8);
  const hasExtraTags = tags.length > 8;

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

  // Featured post is the first post on page 1 with no active search/tag filter
  const isDefaultView = currentPage === 1 && !currentTag && !searchKeyword.trim() && currentSort === 'newest';
  const featuredPost = isDefaultView && filteredPosts.length > 0 ? filteredPosts[0] : null;
  const gridPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

  return (
    <div className="space-y-12 py-10 animate-fade-in">
      {/* 1. Header Section */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {t('blog.title')}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-300 text-sm sm:text-base leading-relaxed max-w-3xl">
          {t('blog.subtitle')}
        </p>
      </div>

      {/* 2. Structured 2-Tier Filter Bar */}
      <div className="space-y-4 bg-white/70 dark:bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm backdrop-blur-sm">
        {/* Tier 1: Search input + Language Segmented Control + Sort dropdown */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={t('blog.search_placeholder')}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-zinc-900 dark:text-zinc-100 transition"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Language Segmented Control */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => handleLangFilterChange('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currentLangFilter === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t('blog.lang_all')}
              </button>
              <button
                type="button"
                onClick={() => handleLangFilterChange('vi')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currentLangFilter === 'vi'
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => handleLangFilterChange('en')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currentLangFilter === 'en'
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                EN
              </button>
            </div>

            {/* Sort Selector */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => handleSortChange('newest')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currentSort === 'newest'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t('blog.sort_newest')}
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('popular')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currentSort === 'popular'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t('blog.sort_popular')}
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Normalized Tags Cloud (Darker harmonious pills) */}
        <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleTagClick('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !currentTag
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-750'
            }`}
          >
            {t('blog.all_tags')}
          </button>

          {visibleTags.map((tObj) => {
            const isSelected = currentTag === tObj.tag.toLowerCase();
            return (
              <button
                key={tObj.tag}
                onClick={() => handleTagClick(tObj.tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-750'
                }`}
              >
                #{tObj.tag} <span className="opacity-60 text-[11px]">({tObj.count})</span>
              </button>
            );
          })}

          {hasExtraTags && (
            <button
              onClick={() => setShowAllTags(!showAllTags)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition inline-flex items-center gap-1"
            >
              {showAllTags ? (
                <>
                  <span>{t('blog.collapse_tags')}</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>{t('blog.see_more_tags')} (+{tags.length - 8})</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. Posts Presentation */}
      {isLoading ? (
        <div className="space-y-6">
          {/* Skeleton Featured */}
          <div className="h-80 rounded-3xl bg-zinc-200/70 dark:bg-zinc-850 animate-pulse"></div>
          {/* Skeleton Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-3xl bg-zinc-200/70 dark:bg-zinc-850 animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-zinc-400 stroke-1" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              {t('blog.no_posts')}
            </p>
            <p className="text-xs text-zinc-500">
              Hãy thử tìm kiếm với từ khóa khác hoặc xóa bớt các bộ lọc đang chọn.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            {t('blog.reset_filter')}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Featured Post Card (Top Hero) */}
          {featuredPost && (
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/90 hover:border-blue-500/60 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col lg:flex-row"
            >
              <div className="lg:w-7/12 h-64 sm:h-80 overflow-hidden relative bg-zinc-900">
                <img
                  src={featuredPost.cover_image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80'}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Dark Vignette Overlay for uniform look across light/dark covers */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('blog.featured_badge')}</span>
                </div>

                <span className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white font-mono text-xs font-bold uppercase tracking-wider border border-white/10 shadow-md">
                  {featuredPost.lang}
                </span>
              </div>

              <div className="lg:w-5/12 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {featuredPost.created_at && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {formatDate(featuredPost.created_at)}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {featuredPost.reading_time} {t('blog.reading_time')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      {featuredPost.views} {t('blog.views')}
                    </span>
                  </div>

                  <h2
                    title={featuredPost.title}
                    className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug"
                  >
                    {featuredPost.title}
                  </h2>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {featuredPost.excerpt || 'Khám phá bài viết chuyên sâu về kỹ thuật, kiến trúc phần mềm và các giải pháp tối ưu hệ thống...'}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      K
                    </div>
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Đỗ Trí Kiên
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span>Đọc ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Standard Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full"
              >
                {/* Card Thumbnail with subtle dark bottom vignette */}
                <div className="h-44 sm:h-48 overflow-hidden bg-zinc-900 relative">
                  <img
                    src={post.cover_image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Overlay gradient tối nhẹ ở đáy ảnh */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                  {/* High contrast language badge */}
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-white/10 shadow-md">
                    {post.lang}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium flex-wrap">
                      {post.created_at && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          {formatDate(post.created_at)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {post.reading_time} {t('blog.reading_time')}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Eye className="w-3 h-3 text-zinc-400" />
                        {post.views}
                      </span>
                    </div>

                    {/* Post Title with native title hover and line-clamp-2 */}
                    <h2
                      title={post.title}
                      className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug"
                    >
                      {post.title}
                    </h2>

                    {/* Excerpt with Fallback description */}
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                      {post.excerpt || 'Nội dung chia sẻ chi tiết về kiến trúc, thực hành tốt nhất và các giải pháp thực tế trong phát triển phần mềm...'}
                    </p>
                  </div>

                  {/* Card Footer: Tags & Author Avatar */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                      {post.tags?.slice(0, 2).map((tVal, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium border border-zinc-200/50 dark:border-zinc-700/50 truncate max-w-[120px]"
                        >
                          #{tVal.toLowerCase()}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" title="Tác giả: Đỗ Trí Kiên">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                        K
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline">
                        @tumivn
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex justify-center">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
