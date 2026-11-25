import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import CopyForLLMButton from '../../components/CopyForLLMButton';
import {
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
  PlayCircle,
  Share2,
  Lock,
  Layers,
  FileText,
  Video as VideoIcon,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { seriesService } from '../../services/seriesService';
import { useApp } from '../../contexts/AppContext';

export default function SeriesDetail() {
  const { slug } = useParams();
  const { lang, t, user } = useApp();
  const [series, setSeries] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [completedItemIds, setCompletedItemIds] = useState([]);

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

        // Fetch user progress if user logged in, else fallback to localStorage
        if (sData?.id) {
          seriesService.getProgress(sData.id)
            .then(progRes => {
              const pData = progRes?.data || progRes;
              if (Array.isArray(pData?.completed_item_ids)) {
                setCompletedItemIds(pData.completed_item_ids);
              }
            })
            .catch(() => {
              try {
                const local = JSON.parse(localStorage.getItem(`series_progress_${sData.id}`) || '[]');
                setCompletedItemIds(local);
              } catch {
                setCompletedItemIds([]);
              }
            });
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [slug]);

  const toggleItemComplete = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();

    const isDone = completedItemIds.includes(item.id);
    const nextCompleted = isDone
      ? completedItemIds.filter((id) => id !== item.id)
      : [...completedItemIds, item.id];

    setCompletedItemIds(nextCompleted);

    // Save locally
    if (series?.id) {
      localStorage.setItem(`series_progress_${series.id}`, JSON.stringify(nextCompleted));
    }

    // Save to backend if user logged in
    if (series?.id && user) {
      try {
        await seriesService.toggleProgress(series.id, item.id);
      } catch (err) {
        console.error('Failed to sync progress to server:', err);
      }
    }
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

  // Unified items list
  const items = series.items || [];
  const publishedItems = items.filter(it => it.item_type !== 'placeholder');
  const totalCount = items.length;
  const completedCount = items.filter(it => completedItemIds.includes(it.id)).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Next learning step (first incomplete item or first published item)
  const nextIncompleteItem = items.find(it => it.item_type !== 'placeholder' && !completedItemIds.includes(it.id)) || publishedItems[0];

  const getStepLink = (item) => {
    if (item.item_type === 'post') return `/blog/${item.slug}`;
    if (item.item_type === 'video') return `/videos/${item.slug}`;
    return null;
  };

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
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>

            <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-md">
              <span className={`w-2 h-2 rounded-full ${series.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              <span>{statusLabel}</span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 font-mono shadow-sm">
                {series.total_posts || 0} bài • {series.total_videos || 0} video
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 font-mono shadow-sm">
                ~{series.total_duration_minutes || 0} phút học
              </span>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/50 dark:border-blue-800/50">
                  Lộ trình học tổng hợp
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
                  Cấp độ: {levelLabel}
                </span>
              </div>

              <CopyForLLMButton
                getMarkdown={async () => {
                  const postsInSeries = series.posts || [];
                  const fullPosts = await Promise.all(
                    postsInSeries.map(async (p) => {
                      if (p.content) return p;
                      try {
                        const res = await api.get(`/posts/${p.slug}`);
                        return res?.data || res || p;
                      } catch {
                        return p;
                      }
                    })
                  );

                  const header = [
                    `# Series: ${series.title}`,
                    '',
                    `> **URL:** ${window.location.href}`,
                    `> **Level:** ${levelLabel}`,
                    series.description ? `> **Description:** ${series.description}` : null,
                    `> **Total Articles:** ${fullPosts.length}`,
                    '',
                    '---',
                    ''
                  ].filter((line) => line !== null).join('\n');

                  const body = fullPosts.map((p, idx) => [
                    `## ${idx + 1}. ${p.title}`,
                    `> Link: ${window.location.origin}/blog/${p.slug}`,
                    '',
                    p.content || p.excerpt || ''
                  ].join('\n')).join('\n\n---\n\n');

                  return `${header}\n${body}`;
                }}
              />
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
                <span>Tiến độ học tập: {completedCount}/{totalCount} mục</span>
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
              {nextIncompleteItem && (
                <Link
                  to={getStepLink(nextIncompleteItem)}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all hover:scale-105 inline-flex items-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>
                    {completedCount > 0
                      ? `Tiếp tục học: Bước ${nextIncompleteItem.position}`
                      : 'Bắt đầu học ngay'}
                  </span>
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

      {/* 3. Main Content: 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Timeline Roadmap (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Dòng thời gian học tập</span>
            </h2>
            <span className="text-xs text-zinc-500 font-medium">
              Bấm vào số tròn để đánh dấu đã hoàn thành
            </span>
          </div>

          {/* Timeline Container */}
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
            {items.map((item, idx) => {
              const isCompleted = completedItemIds.includes(item.id);
              const isPost = item.item_type === 'post';
              const isVideo = item.item_type === 'video';
              const isPlaceholder = item.item_type === 'placeholder';
              const linkUrl = getStepLink(item);

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Node Dot / Checkbox */}
                  {!isPlaceholder ? (
                    <button
                      type="button"
                      onClick={(e) => toggleItemComplete(e, item)}
                      className={`absolute -left-6 sm:-left-8 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all z-10 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-md'
                          : 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 ring-4 ring-white dark:ring-zinc-950'
                      }`}
                      title={isCompleted ? 'Đánh dấu chưa học' : 'Đánh dấu đã hoàn thành'}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </button>
                  ) : (
                    <div className="absolute -left-6 sm:-left-8 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold ring-4 ring-white dark:ring-zinc-950 z-10 shadow-sm">
                      <span className="text-[11px] font-mono">{idx + 1}</span>
                    </div>
                  )}

                  {/* Card View */}
                  {linkUrl ? (
                    <Link
                      to={linkUrl}
                      className={`block p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                        isCompleted
                          ? 'border-emerald-500/40 bg-emerald-50/5 dark:bg-emerald-950/10'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-500/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isPost ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                          }`}>
                            {isPost ? <FileText className="w-3 h-3" /> : <VideoIcon className="w-3 h-3" />}
                            <span>Bước {idx + 1} • {isPost ? 'Bài viết' : 'Video thực hành'}</span>
                          </span>

                          {item.section_title && (
                            <span className="text-zinc-400 truncate max-w-xs">
                              / {item.section_title}
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-normal">
                            <Clock className="w-3.5 h-3.5" />
                            {item.duration || 'N/A'}
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
                        {item.title}
                      </h3>

                      {item.note && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                          {item.note}
                        </p>
                      )}

                      <div className="pt-3 mt-3 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <span>{isPost ? 'Đọc bài viết' : 'Xem video'}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ) : (
                    /* Placeholder Card */
                    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 shadow-sm transition hover:border-zinc-400">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Bước {idx + 1}: {item.section_title || 'Kế hoạch học tập'}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold tracking-wide">
                          Sắp ra mắt
                        </span>
                      </div>

                      <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base mt-2.5">
                        {item.title}
                      </h3>

                      {item.note && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                          {item.note}
                        </p>
                      )}

                      <div className="pt-3 mt-3 flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Dự kiến: {item.duration || '5 phút'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Roadmap Highlights & Author Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Thông tin lộ trình
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Tổng số bước</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalCount} mục</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Bài viết hướng dẫn</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{series.total_posts || 0} bài</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Video thực hành</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{series.total_videos || 0} video</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Mục chuẩn bị</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{series.total_placeholders || 0} mục</span>
              </div>
            </div>
          </div>

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
              {profile?.bio || 'Các bài viết được đúc kết từ kinh nghiệm thực chiến phát triển ứng dụng Production, containerization và kiến trúc bảo mật.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
