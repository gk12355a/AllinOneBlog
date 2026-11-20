import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Eye,
  Share2,
  Bookmark,
  BookmarkCheck,
  Heart,
  ArrowLeft,
  ArrowRight,
  SidebarClose,
  SidebarOpen,
  Type,
  BookOpen
} from 'lucide-react';
import api, { userLibraryApi } from '../../services/api';
import TableOfContents from '../../components/TableOfContents';
import ReactionBar from '../../components/ReactionBar';
import AudioPlayer from '../../components/AudioPlayer';
import CodeBlock from '../../components/CodeBlock';
import CommentSection from '../../components/CommentSection';
import ShareButtons from '../../components/ShareButtons';
import { useApp } from '../../contexts/AppContext';
import NotFound from './NotFound';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function BlogDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const previewToken = searchParams.get('preview');
  const { user, readingFontSize, t } = useApp();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('blog_font_size') || (readingFontSize === 'small' ? 'sm' : readingFontSize === 'large' ? 'lg' : 'base');
  });
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('blog_font_family') || 'sans');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const hasHeadings = React.useMemo(() => {
    if (!post?.content) return false;
    return /^(#{2,3})\s+(.+)$/m.test(post.content);
  }, [post?.content]);

  const renderedContent = React.useMemo(() => {
    if (!post?.content) return '';
    if (post.content_type === 'richtext') {
      return DOMPurify.sanitize(post.content);
    }

    const renderer = new marked.Renderer();
    renderer.heading = ({ text, depth }) => {
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return `<h${depth} id="${id}" class="scroll-mt-24 font-bold tracking-tight">${text}</h${depth}>`;
    };

    const rawHtml = marked.parse(post.content, { renderer, breaks: true, gfm: true });
    return DOMPurify.sanitize(rawHtml);
  }, [post?.content, post?.content_type]);

  const fetchedRef = React.useRef(false);

  useEffect(() => {
    if (readingFontSize) {
      const mapped = readingFontSize === 'small' ? 'sm' : readingFontSize === 'large' ? 'lg' : 'base';
      setFontSize(mapped);
    }
  }, [readingFontSize]);

  useEffect(() => {
    // Ngăn React StrictMode kích hoạt 2 lần trong 1 lần vào trang
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setIsLoading(true);
    const fetchPromise = previewToken
      ? api.get(`/posts/${slug}/preview?token=${previewToken}`)
      : api.get(`/posts/${slug}`);

    fetchPromise
      .then(res => {
        const postData = res?.data || res;
        setPost(postData);
        // Tự động ghi vào lịch sử đọc nếu đã đăng nhập và kiểm tra like/bookmark
        if (user && postData?.id) {
          api.post(`/user/history/${postData.id}`).catch(() => {});
          
          // Kiểm tra xem bài viết đã được like / bookmark chưa
          Promise.all([
            userLibraryApi.getLikes(),
            userLibraryApi.getBookmarks()
          ]).then(([likeRes, bookRes]) => {
            const likeData = likeRes?.data || likeRes;
            const bookData = bookRes?.data || bookRes;
            const likesArr = Array.isArray(likeData) ? likeData : likeData?.likes || [];
            const booksArr = Array.isArray(bookData) ? bookData : bookData?.bookmarks || [];
            setIsLiked(likesArr.some(item => item.post?.id === postData.id || item.post_id === postData.id));
            setIsBookmarked(booksArr.some(item => item.post?.id === postData.id || item.post_id === postData.id));
          }).catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    return () => {
      // Khi người dùng chuyển sang bài viết khác, reset ref để bài mới được đếm
      fetchedRef.current = false;
    };
  }, [slug, previewToken, user]);

  const toggleLike = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để thích bài viết và lưu vào Thư viện của bạn.');
      return;
    }
    try {
      const res = await userLibraryApi.toggleLike(post.id);
      const resData = res?.data || res;
      if (resData?.liked !== undefined) {
        setIsLiked(resData.liked);
      } else {
        setIsLiked(!isLiked);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để lưu bài viết vào Thư viện của bạn.');
      return;
    }
    try {
      if (isBookmarked) {
        await api.delete(`/user/bookmarks/${post.id}`);
        setIsBookmarked(false);
      } else {
        await api.post(`/user/bookmarks/${post.id}`);
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('blog_font_size', size);
  };

  const changeFontFamily = (family) => {
    setFontFamily(family);
    localStorage.setItem('blog_font_family', family);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 space-y-6 animate-pulse">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-3/4"></div>
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/4"></div>
        <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
      </div>
    );
  }

  if (!post) {
    return <NotFound />;
  }

  const fontClass = fontFamily === 'serif' ? 'font-reading-serif' : fontFamily === 'mono' ? 'font-reading-mono' : 'font-reading-sans';
  const sizeClass = fontSize === 'sm' ? 'text-sm leading-relaxed' : fontSize === 'lg' ? 'text-lg leading-relaxed' : fontSize === 'xl' ? 'text-xl leading-loose' : 'text-base leading-relaxed';

  return (
    <div className="py-8 space-y-8 animate-fade-in">
      {post.status === 'draft' && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Chế độ Xem Trước Bản Nháp (Draft Preview Mode) - Bài viết chưa được công khai.</span>
          </div>
          <Link to="/admin" className="px-3 py-1 bg-amber-200 dark:bg-amber-900 rounded-lg hover:opacity-80">
            Quay lại Admin
          </Link>
        </div>
      )}

      {/* Top Reading Controls Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          to="/blog"
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Danh sách bài viết</span>
        </Link>

        {/* Reader Mode & Font Adjustment */}
        <div className="flex items-center gap-2">
          {/* Reader Mode Toggle */}
          <button
            onClick={() => setIsReaderMode(!isReaderMode)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isReaderMode
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Đóng / mở thanh mục lục bên phải để tập trung đọc"
          >
            {isReaderMode ? <SidebarOpen className="w-4 h-4" /> : <SidebarClose className="w-4 h-4" />}
            <span className="hidden sm:inline">Chế độ đọc tập trung</span>
          </button>

          {/* Font Family Switcher */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 text-xs">
            <button
              onClick={() => changeFontFamily('sans')}
              className={`px-2.5 py-1 rounded-md font-sans text-xs transition ${
                fontFamily === 'sans'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Font Không chân (Sans-serif - Hiện đại)"
            >
              Sans
            </button>
            <button
              onClick={() => changeFontFamily('serif')}
              className={`px-2.5 py-1 rounded-md font-serif text-xs transition ${
                fontFamily === 'serif'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Font Có chân (Serif - Sách báo / Tạp chí)"
            >
              Serif
            </button>
            <button
              onClick={() => changeFontFamily('mono')}
              className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                fontFamily === 'mono'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Font Đơn cách (Monospace - Lập trình)"
            >
              Mono
            </button>
          </div>

          {/* Font Size Adjuster */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 text-xs">
            <button
              onClick={() => changeFontSize('base')}
              className={`px-2 py-1 rounded-md text-xs transition ${
                fontSize === 'base'
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Cỡ chữ tiêu chuẩn (16px)"
            >
              A
            </button>
            <button
              onClick={() => changeFontSize('lg')}
              className={`px-2 py-1 rounded-md text-sm font-semibold transition ${
                fontSize === 'lg'
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Cỡ chữ lớn (18px)"
            >
              A+
            </button>
            <button
              onClick={() => changeFontSize('xl')}
              className={`px-2 py-1 rounded-md text-base font-bold transition ${
                fontSize === 'xl'
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Cỡ chữ cực lớn (20px)"
            >
              A++
            </button>
          </div>

          {/* Like Post Button */}
          <button
            onClick={toggleLike}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
              isLiked
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Thích bài viết (Lưu vào Thư viện cá nhân)"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Bookmark */}
          <button
            onClick={toggleBookmark}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
              isBookmarked
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Lưu vào thư viện cá nhân"
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>

          {/* Quick Share Buttons on Top */}
          <div className="hidden sm:block pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <ShareButtons title={post.title} />
          </div>
        </div>
      </div>

      {/* Series Navigation Banner (If article belongs to a series) */}
      {post.series && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Bước {post.order_index || 1}{post.series.total_items ? `/${post.series.total_items}` : (post.series.total_posts ? `/${post.series.total_posts}` : '')} trong lộ trình:
              </p>
              <Link
                to={`/series/${post.series.slug}`}
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                {post.series.title}
              </Link>
            </div>
          </div>

          <Link
            to={`/series/${post.series.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            <span>Xem toàn bộ lộ trình</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className={`grid gap-12 ${isReaderMode || !hasHeadings ? 'max-w-3xl mx-auto w-full' : 'grid-cols-1 lg:grid-cols-4'}`}>
        {/* Article Content Body */}
        <article className={`space-y-6 ${isReaderMode || !hasHeadings ? 'w-full' : 'lg:col-span-3'}`}>
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold uppercase">
                {post.lang}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {post.reading_time} {t('blog.reading_time')}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {post.views} lượt xem
              </span>
              <span>Tác giả: @tumivn</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
              {post.title}
            </h1>

            <p className="text-lg text-zinc-600 dark:text-zinc-400 italic border-l-4 border-blue-600 pl-4 py-1">
              {post.excerpt}
            </p>
          </div>

          {/* Audio Player (Text-to-Speech) */}
          <AudioPlayer textContent={post.content} title={post.title} />

          {/* Cover Image */}
          {post.cover_image && (
            <div className="rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-md my-6 max-h-[460px]">
              <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Content Rendering */}
          <div
            className={`markdown-content max-w-none text-zinc-800 dark:text-zinc-200 ${fontClass} ${sizeClass}`}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />

          {/* Reactions Bar & Bottom Share Toolkit */}
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Cảm xúc của bạn về bài viết này:
                </h4>
                <ReactionBar slug={post.slug} initialReactions={post.reactions} />
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Chia sẻ bài viết:
                </h4>
                <ShareButtons title={post.title} />
              </div>
            </div>
          </div>

          {/* Prev / Next Navigation */}
          {post.navigation && (post.navigation.prev || post.navigation.next) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              {post.navigation.prev ? (
                <Link
                  to={`/blog/${post.navigation.prev.slug}`}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-left"
                >
                  <span className="text-xs text-zinc-400 flex items-center gap-1 mb-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Bài trước
                  </span>
                  <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {post.navigation.prev.title}
                  </span>
                </Link>
              ) : <div></div>}

              {post.navigation.next && (
                <Link
                  to={`/blog/${post.navigation.next.slug}`}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-right"
                >
                  <span className="text-xs text-zinc-400 flex items-center justify-end gap-1 mb-1">
                    Bài tiếp theo <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {post.navigation.next.title}
                  </span>
                </Link>
              )}
            </div>
          )}

          {/* AI Recommended Related Posts */}
          {post.related_posts?.length > 0 && (
            <div className="pt-10 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Bài Viết Liên Quan (AI Gợi Ý)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {post.related_posts.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/blog/${rel.slug}`}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
                  >
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      {rel.reading_time} phút đọc
                    </span>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 mt-1">
                      {rel.title}
                    </h4>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                      {rel.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <CommentSection slug={post.slug} />
        </article>

        {/* Right Sticky Sidebar (TOC) */}
        {!isReaderMode && hasHeadings && (
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="sticky top-24 space-y-4">
              <TableOfContents content={post.content} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
