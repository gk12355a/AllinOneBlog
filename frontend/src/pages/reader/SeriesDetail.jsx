import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Calendar,
  Sparkles,
  PlayCircle,
  Share2,
  Lock,
  Layers,
  Award,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { useApp } from '../../contexts/AppContext';

export default function SeriesDetail() {
  const { slug } = useParams();
  const { lang, t, user } = useApp();
  const [series, setSeries] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Track completed posts in this series from localStorage
  const [completedPostIds, setCompletedPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('completed_series_posts') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get(`/series/${slug}`),
      api.get('/profile')
    ])
      .then(([seriesRes, profileRes]) => {
        const sData = seriesRes?.data || seriesRes;
        const pData = profileRes?.data || profileRes;
        setSeries(sData);
        if (pData) setProfile(pData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [slug]);

  const togglePostComplete = (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    const nextCompleted = completedPostIds.includes(postId)
      ? completedPostIds.filter((id) => id !== postId)
      : [...completedPostIds, postId];
    setCompletedPostIds(nextCompleted);
    localStorage.setItem('completed_series_posts', JSON.stringify(nextCompleted));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: series?.title || 'Series Lộ Trình Học',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
        <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-3xl"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="text-center py-24 space-y-3">
        <Layers className="w-12 h-12 mx-auto text-zinc-400 stroke-1" />
        <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
          Không tìm thấy chuỗi bài viết này.
        </p>
        <Link to="/series" className="text-sm font-semibold text-blue-600 hover:underline inline-block">
          Quay lại danh sách Series
        </Link>
      </div>
    );
  }

  // Calculate actual reading time of published posts
  const publishedPosts = series.posts || [];
  const totalPostsCount = publishedPosts.length;
  const totalReadingTime = series.total_reading_time || (totalPostsCount * 6);
  const completedCount = publishedPosts.filter((p) => completedPostIds.includes(p.id)).length;
  const progressPercent = totalPostsCount > 0 ? Math.round((completedCount / totalPostsCount) * 100) : 0;

  // First post link
  const firstPost = publishedPosts.length > 0 ? publishedPosts[0] : null;

  // Upcoming lessons from backend ONLY (zero hardcoded mock)
  const plannedRoadmapLessons = Array.isArray(series.upcoming_lessons) ? series.upcoming_lessons : [];
  const totalCurriculumCount = totalPostsCount + plannedRoadmapLessons.length;

  const levelLabel = {
    beginner: 'Cơ bản',
    intermediate: 'Trung cấp',
    advanced: 'Chuyên sâu'
  }[series.level || 'beginner'] || 'Cơ bản';

  const statusLabel = {
    updating: 'Đang cập nhật',
    completed: 'Hoàn thành',
    upcoming: 'Sắp ra mắt'
  }[series.status || 'updating'] || 'Đang cập nhật';

  return (
    <div className="py-10 space-y-10 animate-fade-in">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
        <Link
          to="/series"
          className="flex items-center gap-1.5 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('series.breadcrumb_all')}</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
          {series.title}
        </span>
      </nav>

      {/* 2. Series Hero Banner */}
      <div className="rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col lg:flex-row">
        {series.cover_image && (
          <div className="lg:w-5/12 h-64 sm:h-80 lg:h-auto overflow-hidden relative bg-zinc-900 shrink-0">
            <img
              src={series.cover_image}
              alt={series.title}
              className="w-full h-full object-cover"
            />
            {/* Dark gradient overlay for readable text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>

            <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-md">
              <span className={`w-2 h-2 rounded-full ${series.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              <span>{statusLabel}</span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 font-mono shadow-sm">
                {totalPostsCount} bài đã phát hành
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 font-mono shadow-sm">
                ~{totalReadingTime} {t('blog.reading_time')}
              </span>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/50 dark:border-blue-800/50">
                Lộ trình học
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
                Cấp độ: {levelLabel}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug text-balance">
              {series.title}
            </h1>

            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl text-pretty">
              {series.description}
            </p>
          </div>

          {/* Action Row & Progress Bar */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <span>{t('series.progress')}: {completedCount}/{totalPostsCount} bài đã phát hành</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {firstPost && (
                <Link
                  to={`/blog/${firstPost.slug}`}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all hover:scale-105 inline-flex items-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>{completedCount > 0 ? t('series.continue_learning') : t('series.start_learning')}</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleShare}
                className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition inline-flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>{copied ? 'Đã sao chép link!' : 'Chia sẻ lộ trình'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content: 2-Column Layout with Sticky Sidebar on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Timeline Roadmap (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>{t('series.roadmap_posts')}</span>
            </h2>
            <span className="text-xs text-zinc-500 font-medium">
              Bấm vào số thứ tự tròn để đánh dấu bài đã học
            </span>
          </div>

          {/* Timeline Container */}
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
            {/* Published Articles */}
            {publishedPosts.map((post, idx) => {
              const isCompleted = completedPostIds.includes(post.id);

              return (
                <div key={post.id} className="relative group">
                  {/* Timeline Node Dot / Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => togglePostComplete(e, post.id)}
                    className={`absolute -left-6 sm:-left-8 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all z-10 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-md'
                        : 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 ring-4 ring-white dark:ring-zinc-950'
                    }`}
                    title={isCompleted ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã hoàn thành'}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                  </button>

                  {/* Card Link */}
                  <Link
                    to={`/blog/${post.slug}`}
                    className={`block p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                      isCompleted
                        ? 'border-emerald-500/40 bg-emerald-50/5 dark:bg-emerald-950/10'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-500/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <span>Bài {idx + 1}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-normal">
                          <Clock className="w-3.5 h-3.5" />
                          {post.reading_time || 5} {t('blog.reading_time')}
                        </span>
                      </div>

                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã học</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base sm:text-lg mt-3 leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                      {post.excerpt || 'Tìm hiểu các nguyên lý thiết kế và ứng dụng thực tiễn trong dự án.'}
                    </p>

                    <div className="pt-3 mt-3 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <span>Vào bài học</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </div>
              );
            })}

            {/* Upcoming Roadmap Lessons (Chỉ hiển thị khi có dữ liệu từ admin) */}
            {plannedRoadmapLessons.map((lesson, idx) => {
              const lessonOrder = totalPostsCount + idx + 1;
              return (
                <div key={lesson.id || idx} className="relative group">
                  {/* Locked Node */}
                  <div className="absolute -left-6 sm:-left-8 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold ring-4 ring-white dark:ring-zinc-950 z-10 shadow-sm">
                    <span className="text-[11px] font-mono">{lessonOrder}</span>
                  </div>

                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 shadow-sm transition hover:border-zinc-400">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Bài {lessonOrder}: {lesson.stage || 'Kế hoạch học tập'}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold tracking-wide">
                        {t('series.coming_soon_tag')}
                      </span>
                    </div>

                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base mt-2.5">
                      {lesson.title}
                    </h3>

                    {lesson.excerpt && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                        {lesson.excerpt}
                      </p>
                    )}

                    <div className="pt-3 mt-3 flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Dự kiến: ~{lesson.reading_time || 5} phút đọc</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Sticky Roadmap Info & Instructor Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* Roadmap Highlights */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Thông tin lộ trình
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Tổng bài học</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalCurriculumCount} bài</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Đã phát hành</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalPostsCount} bài</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Đang chuẩn bị</span>
                <span className="font-bold text-zinc-400">{plannedRoadmapLessons.length} bài</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Định dạng</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">Bài viết kỹ thuật + Code mẫu</span>
              </div>
            </div>
          </div>

          {/* Instructor / Author Card (Lấy động từ Profile) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Tác giả biên soạn
            </h3>

            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Tác giả'}
                  className="w-12 h-12 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  {profile?.full_name?.charAt(0) || 'K'}
                </div>
              )}
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {profile?.full_name || 'Đỗ Trí Kiên'}
                </h4>
                <p className="text-xs text-zinc-500">
                  {profile?.headline || 'DevOps & Full-Stack Engineer'}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {profile?.bio || 'Các bài viết được đúc kết từ kinh nghiệm thực chiến phát triển ứng dụng Production, containerization và triển khai hệ thống bảo mật cao.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
