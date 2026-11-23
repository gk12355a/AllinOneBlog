import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  History,
  Heart,
  Bookmark,
  Trash2,
  ArrowRight,
  Clock,
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  ExternalLink,
  Tag
} from 'lucide-react';
import { userLibraryApi } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

export default function MyLibrary() {
  const { user, t, currentLang } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab persistence via URL: ?tab=history | likes | bookmarks
  const activeTab = searchParams.get('tab') || 'history';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [history, setHistory] = useState([]);
  const [likes, setLikes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/my-library');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [histRes, likeRes, bookRes] = await Promise.all([
        userLibraryApi.getHistory(),
        userLibraryApi.getLikes(),
        userLibraryApi.getBookmarks()
      ]);
      const histData = histRes?.data || histRes;
      const likeData = likeRes?.data || likeRes;
      const bookData = bookRes?.data || bookRes;

      if (histData?.history) setHistory(histData.history);
      else if (Array.isArray(histData)) setHistory(histData);

      if (Array.isArray(likeData)) setLikes(likeData);
      else if (likeData?.likes) setLikes(likeData.likes);

      if (Array.isArray(bookData)) setBookmarks(bookData);
      else if (bookData?.bookmarks) setBookmarks(bookData.bookmarks);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  };

  // Safe relative time formatter (avoids "Invalid Date" bug entirely)
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return currentLang === 'vi' ? 'Vừa xong' : 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return currentLang === 'vi' ? `${diffMin} phút trước` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return currentLang === 'vi' ? `${diffHours} giờ trước` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return currentLang === 'vi' ? 'Hôm qua' : 'Yesterday';
    if (diffDays < 7) return currentLang === 'vi' ? `${diffDays} ngày trước` : `${diffDays}d ago`;
    return currentLang === 'vi'
      ? `${d.getDate()} Th${d.getMonth() + 1}, ${d.getFullYear()}`
      : `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}, ${d.getFullYear()}`;
  };

  // Clear all reading history
  const handleClearHistory = async () => {
    if (!window.confirm(t('library.clear_confirm') || 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử đọc bài không?')) return;
    try {
      await userLibraryApi.clearHistory();
      setHistory([]);
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  // Delete single history item
  const handleDeleteHistoryItem = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await userLibraryApi.deleteHistoryItem(postId);
      setHistory(prev => prev.filter(item => item.post?.id !== postId));
    } catch (err) {
      console.error('Error deleting history item:', err);
    }
  };

  // Remove bookmark
  const handleRemoveBookmark = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await userLibraryApi.removeBookmark(postId);
      setBookmarks(prev => prev.filter(item => item.post?.id !== postId));
    } catch (err) {
      console.error('Error removing bookmark:', err);
    }
  };

  // Unlike post
  const handleToggleLike = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await userLibraryApi.toggleLike(postId);
      setLikes(prev => prev.filter(item => item.post?.id !== postId));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Current list based on active tab
  const currentList = useMemo(() => {
    if (activeTab === 'likes') return likes;
    if (activeTab === 'bookmarks') return bookmarks;
    return history;
  }, [activeTab, history, likes, bookmarks]);

  // Filtered by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase().trim();
    return currentList.filter(item => {
      const title = item.post?.title?.toLowerCase() || '';
      const tags = (item.post?.tags || []).join(' ').toLowerCase();
      const excerpt = item.post?.excerpt?.toLowerCase() || '';
      return title.includes(q) || tags.includes(q) || excerpt.includes(q);
    });
  }, [currentList, searchQuery]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-sm font-medium text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="py-10 space-y-8 animate-fade-in min-h-[65vh]">
      {/* 1. Page Header (Khớp 100% căn lề với Header & Footer) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('library.title')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 [text-wrap:balance]">
            {t('library.title')}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base mt-2 leading-relaxed">
            {t('library.subtitle')}
          </p>
        </div>

        {/* Search bar inside library */}
        {currentList.length > 0 && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('library.search_placeholder') || 'Tìm kiếm trong thư viện...'}
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm transition"
            />
          </div>
        )}
      </div>

      {/* 2. Tabs navigation & Clear button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-px">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto [scrollbar-width:none]">
          {/* Tab 1: Reading History */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 pb-3.5 px-1 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t('library.reading_history')}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
              activeTab === 'history'
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}>
              {history.length}
            </span>
          </button>

          {/* Tab 2: Liked Posts */}
          <button
            type="button"
            onClick={() => setActiveTab('likes')}
            className={`flex items-center gap-2 pb-3.5 px-1 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'likes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>{t('library.liked_posts')}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
              activeTab === 'likes'
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}>
              {likes.length}
            </span>
          </button>

          {/* Tab 3: Saved Bookmarks */}
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 pb-3.5 px-1 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'bookmarks'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>{t('library.saved_posts')}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
              activeTab === 'bookmarks'
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}>
              {bookmarks.length}
            </span>
          </button>
        </div>

        {/* Nút Xóa toàn bộ lịch sử (Đặt ở vị trí an toàn, không bị dropdown che) */}
        {activeTab === 'history' && history.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 mb-2 sm:mb-0 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('library.clear_history')}</span>
          </button>
        )}
      </div>

      {/* 3. Danh sách bài viết phong phú (Thumbnail, Tags, Tương đối, Xóa lẻ) */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          /* Trạng thái trống (Empty State) */
          <div className="text-center py-20 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4">
            {activeTab === 'history' && <History className="w-12 h-12 mx-auto text-zinc-400 stroke-1" />}
            {activeTab === 'likes' && <Heart className="w-12 h-12 mx-auto text-rose-400 stroke-1" />}
            {activeTab === 'bookmarks' && <Bookmark className="w-12 h-12 mx-auto text-amber-400 stroke-1" />}

            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                {activeTab === 'history' && t('library.no_history')}
                {activeTab === 'likes' && t('library.no_likes')}
                {activeTab === 'bookmarks' && t('library.no_bookmarks')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                {searchQuery
                  ? 'Không tìm thấy bài viết nào phù hợp với từ khóa.'
                  : 'Hãy khám phá các bài viết chất lượng trong blog để làm giàu thư viện học tập của bạn.'}
              </p>
            </div>

            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md hover:shadow-lg"
            >
              <span>{t('library.explore_articles')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          filteredList.map((item) => {
            const post = item.post;
            if (!post) return null;

            // Date fallback: supports viewed_at, saved_at, liked_at, created_at safely
            const dateValue = item.viewed_at || item.saved_at || item.liked_at || item.created_at || post.created_at;
            const relativeTimeStr = formatRelativeTime(dateValue);

            const tagsList = Array.isArray(post.tags) ? post.tags : (post.tags ? post.tags.split(',') : []);

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className="group relative cursor-pointer flex items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500/50 hover:shadow-md transition-all duration-200"
              >
                {/* Trái: Thumbnail bài viết */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-100 dark:border-zinc-800 relative">
                    {post.cover_image || post.thumbnail ? (
                      <img
                        src={post.cover_image || post.thumbnail}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-500/10 to-purple-500/20 text-indigo-500">
                        <BookOpen className="w-6 h-6 stroke-1" />
                      </div>
                    )}
                  </div>

                  {/* Giữa: Chi tiết bài viết */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Tags */}
                    {tagsList.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {tagsList.slice(0, 2).map((tg, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-medium"
                          >
                            #{tg.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h3
                      title={post.title}
                      className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 [text-wrap:balance]"
                    >
                      {post.title}
                    </h3>

                    {/* Metadata line: Relative time + reading time */}
                    <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {relativeTimeStr && (
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{relativeTimeStr}</span>
                        </span>
                      )}
                      {relativeTimeStr && <span>•</span>}
                      <span>{post.reading_time || 1} {t('blog.reading_time')}</span>
                      {post.series?.title && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[150px]">
                            {post.series.title}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phải: Các nút thao tác từng hàng */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Nút xóa lẻ trong History */}
                  {activeTab === 'history' && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteHistoryItem(e, post.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                      title={t('library.remove_history_item') || 'Xóa khỏi lịch sử'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Nút bỏ lưu trong Bookmarks */}
                  {activeTab === 'bookmarks' && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveBookmark(e, post.id)}
                      className="p-2 rounded-xl text-amber-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                      title={t('library.remove_bookmark') || 'Bỏ lưu bài viết'}
                    >
                      <Bookmark className="w-4 h-4 fill-amber-500" />
                    </button>
                  )}

                  {/* Nút bỏ thích trong Likes */}
                  {activeTab === 'likes' && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(e, post.id)}
                      className="p-2 rounded-xl text-rose-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                      title="Bỏ thích bài viết"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>
                  )}

                  {/* Nút sang bài viết */}
                  <div className="p-2 rounded-xl text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
