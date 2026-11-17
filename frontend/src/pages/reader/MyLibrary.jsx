import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, Heart, Bookmark, Trash2, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { userLibraryApi } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

export default function MyLibrary() {
  const { user, t } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('history'); // 'history', 'likes', 'bookmarks'
  const [history, setHistory] = useState([]);
  const [likes, setLikes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/library');
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
      const histData = histRes.data || histRes;
      const likeData = likeRes.data || likeRes;
      const bookData = bookRes.data || bookRes;

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

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your reading history?')) return;
    try {
      await userLibraryApi.clearHistory();
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveBookmark = async (postId) => {
    try {
      await userLibraryApi.removeBookmark(postId);
      setBookmarks(bookmarks.filter(item => item.post?.id !== postId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('my_library')}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage your read history, liked articles, and bookmarks.</p>
        </div>
        {activeTab === 'history' && history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('clear_history')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8 space-x-6">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <History className="w-4 h-4" />
          {t('reading_history')} ({history.length})
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'likes'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Heart className="w-4 h-4" />
          {t('liked_posts')} ({likes.length})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'bookmarks'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          {t('saved_posts')} ({bookmarks.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'history' && (
          history.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{t('no_posts')}</p>
            </div>
          ) : (
            history.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500/50 transition group"
              >
                <div className="min-w-0 pr-4">
                  <Link
                    to={`/blog/${item.post?.slug}`}
                    className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 block truncate"
                  >
                    {item.post?.title}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.viewed_at).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>{item.post?.reading_time} {t('min_read')}</span>
                  </div>
                </div>
                <Link
                  to={`/blog/${item.post?.slug}`}
                  className="opacity-0 group-hover:opacity-100 p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))
          )
        )}

        {activeTab === 'likes' && (
          likes.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{t('no_posts')}</p>
            </div>
          ) : (
            likes.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500/50 transition group"
              >
                <div className="min-w-0 pr-4">
                  <Link
                    to={`/blog/${item.post?.slug}`}
                    className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 block truncate"
                  >
                    {item.post?.title}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{item.post?.reading_time} {t('min_read')}</span>
                  </div>
                </div>
                <Link
                  to={`/blog/${item.post?.slug}`}
                  className="opacity-0 group-hover:opacity-100 p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))
          )
        )}

        {activeTab === 'bookmarks' && (
          bookmarks.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{t('no_posts')}</p>
            </div>
          ) : (
            bookmarks.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500/50 transition group"
              >
                <div className="min-w-0 pr-4">
                  <Link
                    to={`/blog/${item.post?.slug}`}
                    className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 block truncate"
                  >
                    {item.post?.title}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{item.post?.reading_time} {t('min_read')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRemoveBookmark(item.post?.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/blog/${item.post?.slug}`}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
