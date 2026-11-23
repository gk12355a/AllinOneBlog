import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Play, Clock, Eye, Calendar, Tag, Share2, ArrowLeft, 
  Layers, FileText, CheckCircle2, Bookmark, BookmarkCheck, 
  ExternalLink, Sparkles, Check
} from 'lucide-react';
import { YoutubeIcon } from '../../components/SocialIcons';
import contentService from '../../services/contentService';
import userService from '../../services/userService';
import { useApp } from '../../contexts/AppContext';

export default function VideoDetail() {
  const { slug } = useParams();
  const { user, lang, t } = useApp();
  const [video, setVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setIsPlaying(false);
    contentService.getVideo(slug)
      .then(res => {
        const vData = res?.data || res;
        setVideo(vData);
        // Tăng lượt xem video
        if (vData?.id) {
          contentService.incrementVideoView(vData.id).catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [slug]);

  // Extract YouTube ID
  const extractYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="aspect-video w-full rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-3/4" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/3" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-24 space-y-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {lang === 'vi' ? 'Video không tồn tại hoặc đã bị gỡ' : 'Video not found'}
        </h2>
        <Link to="/videos" className="text-indigo-600 hover:underline text-sm font-semibold inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Quay lại danh sách video' : 'Back to video list'}</span>
        </Link>
      </div>
    );
  }

  const ytId = extractYouTubeId(video.video_url);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 animate-fade-in">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/videos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Tất cả video' : 'All videos'}</span>
        </Link>

        {video.series_info && (
          <Link
            to={`/series/${video.series_info.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{video.series_info.title}</span>
          </Link>
        )}
      </div>

      {/* Video Player: High-Performance Facade (Only loads iframe on play click) */}
      <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        {isPlaying && ytId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div 
            onClick={() => setIsPlaying(true)}
            className="relative w-full h-full cursor-pointer group"
          >
            <img
              src={video.thumbnail_url || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80')}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            />
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 group-hover:from-black/70 transition-all" />

            {/* Centered Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300">
                <Play className="w-8 h-8 fill-white ml-1" />
              </div>
            </div>

            {/* Bottom Meta Overlay */}
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-white text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md font-mono">
                  {video.duration || 'Video'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-600/80 backdrop-blur-md">
                  {video.category || 'Tech'}
                </span>
              </div>
              <span className="text-zinc-300">
                {lang === 'vi' ? 'Nhấp để phát video' : 'Click to play'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Video Information Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
            {video.title}
          </h1>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition"
              title="Sao chép liên kết video"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? (lang === 'vi' ? 'Đã sao chép' : 'Copied!') : (lang === 'vi' ? 'Chia sẻ' : 'Share')}</span>
            </button>
            <a
              href={video.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 transition"
            >
              <YoutubeIcon className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </a>
          </div>
        </div>

        {/* Meta Stats Row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>{video.view_count || 1} {lang === 'vi' ? 'lượt xem' : 'views'}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{video.duration || 'N/A'}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{video.created_at ? new Date(video.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : ''}</span>
          </span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {video.language === 'en' ? 'EN' : 'VI'}
          </span>
        </div>
      </div>

      {/* Main Content Layout (Description + Chapters + Related) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Description & Chapters */}
        <div className="lg:col-span-8 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">
              {lang === 'vi' ? 'Mô tả nội dung' : 'Video Overview'}
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {video.description || (lang === 'vi' ? 'Chưa có mô tả chi tiết cho video này.' : 'No description provided.')}
            </p>
          </div>

          {/* Chapters / Timeline */}
          {Array.isArray(video.chapters) && video.chapters.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>{lang === 'vi' ? 'Mục lục video (Chapters)' : 'Video Chapters'}</span>
              </h3>
              <div className="space-y-2">
                {video.chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer group"
                    onClick={() => {
                      setIsPlaying(true);
                    }}
                  >
                    <span className="px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                      {ch.time}
                    </span>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {ch.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Related Post & Series Siblings */}
        <div className="lg:col-span-4 space-y-6">
          {/* Related Blog Post */}
          {video.related_post && (
            <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Bài viết đi kèm' : 'Companion Article'}</span>
              </span>

              {video.related_post.cover_image && (
                <div className="h-28 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img src={video.related_post.cover_image} alt={video.related_post.title} className="w-full h-full object-cover" />
                </div>
              )}

              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                {video.related_post.title}
              </h4>
              <p className="text-xs text-zinc-500 line-clamp-2">
                {video.related_post.summary}
              </p>

              <Link
                to={`/blog/${video.related_post.slug}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition"
              >
                <span>{lang === 'vi' ? 'Đọc bài viết' : 'Read Article'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Sibling Videos in same Series */}
          {video.series_videos && video.series_videos.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>{lang === 'vi' ? 'Video cùng Series' : 'Series Playlist'}</span>
              </span>

              <div className="space-y-2">
                {video.series_videos.map((sv) => {
                  const isCurrent = sv.slug === video.slug || sv.id === video.id;
                  return (
                    <Link
                      key={sv.id}
                      to={`/videos/${sv.slug || sv.id}`}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition ${
                        isCurrent
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/40'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="truncate pr-2">{sv.title}</span>
                      <span className="text-[11px] font-mono text-zinc-400 flex-shrink-0">{sv.duration || 'Video'}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
