import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  X,
  ZoomIn,
  ZoomOut,
  Calendar,
  Camera,
  Share2,
  Download,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  ArrowUp,
  RotateCcw
} from 'lucide-react';
import { mediaApi } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

export default function AlbumDetail() {
  const { slug } = useParams();
  const { t, currentLang } = useApp();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lightbox & Google Drive-like Zoom & Pan state
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 0.5x to 5x
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPhotoUrl, setCopiedPhotoUrl] = useState(false);

  useEffect(() => {
    setLoading(true);
    mediaApi.getAlbum(slug)
      .then(res => {
        const data = res?.data || res;
        if (data) {
          setAlbum(data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }, [slug]);

  // Format date helper
  const formatAlbumDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const year = d.getFullYear();
    if (currentLang === 'vi') {
      return `${day} Th${d.getMonth() + 1}, ${year}`;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]}, ${year}`;
  };

  const photos = album?.photos || [];

  // Reset zoom & pan back to original 1x centered
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  // Google Drive-like Mouse Wheel Zoom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || activePhotoIndex === null) return;

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Scrolling UP (deltaY < 0) zooms in, Scrolling DOWN (deltaY > 0) zooms out
      const step = e.deltaY < 0 ? 0.2 : -0.2;
      setZoomLevel((prev) => {
        const next = Math.min(Math.max(parseFloat((prev + step).toFixed(2)), 0.5), 5);
        if (next <= 1) {
          setPanPosition({ x: 0, y: 0 });
        }
        return next;
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [activePhotoIndex]);

  // Mouse Drag to Pan when zoomed in
  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    if (e.button !== 0) return; // Left click only
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    e.preventDefault();
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click toggles between 1x and 2.5x (like Google Drive)
  const handleDoubleClick = (e) => {
    e.preventDefault();
    if (zoomLevel > 1) {
      resetZoom();
    } else {
      setZoomLevel(2.5);
    }
  };

  // Lightbox Navigation Controls
  const handlePrevPhoto = useCallback(() => {
    if (activePhotoIndex === null || photos.length === 0) return;
    resetZoom();
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [activePhotoIndex, photos.length, resetZoom]);

  const handleNextPhoto = useCallback(() => {
    if (activePhotoIndex === null || photos.length === 0) return;
    resetZoom();
    setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [activePhotoIndex, photos.length, resetZoom]);

  const handleCloseLightbox = useCallback(() => {
    setActivePhotoIndex(null);
    resetZoom();
  }, [resetZoom]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (activePhotoIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCloseLightbox();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'ArrowRight') handleNextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, handleCloseLightbox, handlePrevPhoto, handleNextPhoto]);

  // Share Album Link
  const handleShareAlbum = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: album?.title || 'Album',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Copy current photo URL
  const handleCopyPhotoUrl = async (url) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedPhotoUrl(true);
      setTimeout(() => setCopiedPhotoUrl(false), 2000);
    } catch (e) {
      console.error('Failed to copy photo url:', e);
    }
  };

  // Scroll to top helper
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-sm font-medium text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{t('albums.empty')}</h2>
        <Link
          to="/albums"
          className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> {t('albums.back_to_albums')}
        </Link>
      </div>
    );
  }

  const activePhoto = activePhotoIndex !== null ? photos[activePhotoIndex] : null;

  return (
    <div className="py-10 space-y-12 animate-fade-in">
      {/* 1. Header & Breadcrumb & Action bar */}
      <div className="space-y-6 border-b border-zinc-200 dark:border-zinc-800/80 pb-8">
        {/* Breadcrumb matching header margin */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
          <nav className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Link
              to="/albums"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t('albums.back_to_albums')}</span>
            </Link>
            <span>/</span>
            <span className="text-zinc-800 dark:text-zinc-200 truncate max-w-xs sm:max-w-md">
              {album.title}
            </span>
          </nav>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShareAlbum}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition hover:shadow-sm"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">{t('albums.share_copied')}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('albums.share')}</span>
              </>
            )}
          </button>
        </div>

        {/* Title & Metadata Hero */}
        <div className="max-w-3xl space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight [text-wrap:balance]">
            {album.title}
          </h1>

          {album.description && (
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed [text-wrap:pretty]">
              {album.description}
            </p>
          )}

          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>{formatAlbumDate(album.event_date || album.created_at)}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              <Camera className="w-3.5 h-3.5 text-indigo-500" />
              <span>{photos.length} {t('albums.photos_count')}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Nhấp vào bất kỳ ảnh nào để xem toàn màn hình</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Masonry Gallery: Giữ nguyên tỉ lệ gốc của ảnh */}
      {photos.length === 0 ? (
        <div className="text-center py-20 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30">
          <Camera className="w-12 h-12 mx-auto text-zinc-400 stroke-1 mb-2" />
          <p className="text-zinc-600 dark:text-zinc-400 font-semibold">{t('albums.empty')}</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {photos.map((photo, idx) => {
            const photoUrl = photo.photo_url || photo.url;
            return (
              <div
                key={photo.id || idx}
                onClick={() => {
                  setActivePhotoIndex(idx);
                  setIsZoomed(false);
                }}
                className="break-inside-avoid group relative cursor-pointer overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-2xl transition-all duration-300"
              >
                {/* Ảnh với tỉ lệ tự nhiên, không bị crop cứng */}
                <img
                  src={photoUrl}
                  alt={photo.caption || `${album.title} - ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-auto object-cover block group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                />

                {/* Hover overlay với caption và icon zoom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white">
                  {/* Góc trên: badge số thứ tự */}
                  <div className="flex justify-end">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono font-bold text-white border border-white/20">
                      {idx + 1} / {photos.length}
                    </span>
                  </div>

                  {/* Góc dưới: caption và zoom icon */}
                  <div className="space-y-1">
                    {photo.caption && (
                      <p className="text-xs sm:text-sm font-medium line-clamp-2 drop-shadow">
                        {photo.caption}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-white/80 pt-1 border-t border-white/20">
                      <span className="text-[11px]">Xem toàn màn hình</span>
                      <ZoomIn className="w-4 h-4 text-indigo-300" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Bottom Navigation: Album trước / sau & Về danh sách */}
      <div className="pt-10 border-t border-zinc-200 dark:border-zinc-800/80 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          {/* Cột trái: Album trước */}
          <div>
            {album.prev_album ? (
              <Link
                to={`/album/${album.prev_album.slug}`}
                className="group flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500/50 hover:shadow-md transition"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:-translate-x-1 transition shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t('albums.prev_album')}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {album.prev_album.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          {/* Cột giữa: Nút Về danh sách Albums & Lên đầu trang */}
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/albums"
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              {t('albums.all_albums')}
            </Link>
            <button
              type="button"
              onClick={scrollToTop}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              title="Lên đầu trang"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>

          {/* Cột phải: Album sau */}
          <div>
            {album.next_album ? (
              <Link
                to={`/album/${album.next_album.slug}`}
                className="group flex items-center justify-between gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500/50 hover:shadow-md transition text-right"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t('albums.next_album')}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {album.next_album.title}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>
        </div>
      </div>

      {/* 4. LIGHTBOX TOÀN MÀN HÌNH CHUYÊN NGHIỆP */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between animate-fade-in select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseLightbox();
          }}
        >
          {/* Header Lightbox */}
          <div className="p-4 sm:px-6 flex items-center justify-between text-white border-b border-white/10 z-10">
            {/* Vị trí ảnh & Tên ảnh */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-mono font-bold tracking-wider">
                {activePhotoIndex + 1} / {photos.length}
              </span>
              <span className="text-xs text-white/70 truncate hidden sm:inline max-w-sm">
                {activePhoto.caption || album.title}
              </span>
            </div>

            {/* Các nút công cụ Zoom & Hành động */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Nút Thu nhỏ (-) */}
              <button
                type="button"
                onClick={() => {
                  setZoomLevel((prev) => {
                    const next = Math.max(parseFloat((prev - 0.25).toFixed(2)), 0.5);
                    if (next <= 1) setPanPosition({ x: 0, y: 0 });
                    return next;
                  });
                }}
                disabled={zoomLevel <= 0.5}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition disabled:opacity-40"
                title="Thu nhỏ (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Badge % Zoom hiển thị tỷ lệ phóng to (Click để Reset về 100%) */}
              <button
                type="button"
                onClick={resetZoom}
                className="px-2.5 py-1 text-xs font-mono font-bold rounded-xl bg-white/10 hover:bg-white/20 text-indigo-300 hover:text-white transition"
                title="Nhấp để đặt lại 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              {/* Nút Phóng to (+) */}
              <button
                type="button"
                onClick={() => {
                  setZoomLevel((prev) => Math.min(parseFloat((prev + 0.25).toFixed(2)), 5));
                }}
                disabled={zoomLevel >= 5}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition disabled:opacity-40"
                title="Phóng to (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Nút Reset Zoom nếu đang phóng to */}
              {zoomLevel !== 1 && (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition animate-fade-in"
                  title="Đặt lại kích thước gốc (100%)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />

              {/* Nút Tải ảnh */}
              <a
                href={activePhoto.photo_url || activePhoto.url}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
                title={t('albums.download') || 'Tải ảnh'}
              >
                <Download className="w-4 h-4" />
              </a>

              {/* Nút Copy URL ảnh */}
              <button
                type="button"
                onClick={() => handleCopyPhotoUrl(activePhoto.photo_url || activePhoto.url)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
                title="Sao chép link ảnh"
              >
                {copiedPhotoUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Nút Đóng */}
              <button
                type="button"
                onClick={handleCloseLightbox}
                className="p-2 rounded-xl bg-white/10 hover:bg-red-600 text-white/80 hover:text-white transition ml-1"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Vùng ảnh chính: Hỗ trợ Scroll chuột phóng to/thu nhỏ như Google Drive & Kéo thả di chuyển */}
          <div
            ref={viewportRef}
            className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Nút Previous */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevPhoto();
                }}
                className="absolute left-4 sm:left-6 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/80 hover:text-white backdrop-blur-md transition-all border border-white/10 hover:scale-110 shadow-2xl"
                title="Ảnh trước (Mũi tên trái)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Container hiển thị ảnh có transform zoom & pan */}
            <div
              className={`relative max-w-full max-h-full flex items-center justify-center ${
                zoomLevel > 1
                  ? isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
                  : 'cursor-zoom-in'
              }`}
              onDoubleClick={handleDoubleClick}
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
              }}
            >
              <img
                src={activePhoto.photo_url || activePhoto.url}
                alt={activePhoto.caption || ''}
                draggable={false}
                className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl pointer-events-none"
              />
            </div>

            {/* Nút Next */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextPhoto();
                }}
                className="absolute right-4 sm:right-6 z-20 p-3 rounded-full bg-black/60 hover:bg-white/20 text-white/80 hover:text-white backdrop-blur-md transition-all border border-white/10 hover:scale-110 shadow-2xl"
                title="Ảnh tiếp theo (Mũi tên phải)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Footer Lightbox: Chú thích ảnh & Hướng dẫn cử chỉ tiện lợi */}
          <div className="p-4 sm:px-6 bg-black/60 backdrop-blur-md border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left z-10">
            <div className="min-w-0 flex-1">
              {activePhoto.caption ? (
                <p className="text-sm font-medium text-white max-w-2xl truncate">
                  {activePhoto.caption}
                </p>
              ) : (
                <p className="text-xs text-zinc-400 italic">
                  {album.title}
                </p>
              )}
            </div>

            <div className="text-[11px] text-zinc-400 font-mono hidden md:flex items-center gap-3">
              <span className="text-indigo-300 font-semibold">🖱️ Cuộn chuột để zoom</span>
              <span>•</span>
              <span>Kéo để di chuyển</span>
              <span>•</span>
              <span>Nhấp đúp: 2.5x</span>
              <span>•</span>
              <span>← / → : Chuyển ảnh</span>
              <span>•</span>
              <span>Esc : Đóng</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
