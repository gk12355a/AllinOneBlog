import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Camera, Calendar, ArrowRight, Search, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useApp } from '../../contexts/AppContext';

export default function Albums() {
  const { t, currentLang } = useApp();
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get('/albums')
      .then(res => {
        const data = res?.data || res;
        setAlbums(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

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

  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albums;
    const q = searchQuery.toLowerCase().trim();
    return albums.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
  }, [albums, searchQuery]);

  return (
    <div className="py-10 space-y-8 animate-fade-in min-h-[65vh]">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 mb-3">
            <Camera className="w-3.5 h-3.5" />
            <span>{t('albums.title')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight [text-wrap:balance]">
            {t('albums.title')}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 mt-2 text-sm sm:text-base leading-relaxed">
            {t('albums.subtitle')}
          </p>
        </div>

        {/* Search bar */}
        {albums.length > 0 && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('albums.search_placeholder') || 'Tìm kiếm album...'}
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm transition"
            />
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm animate-pulse">
              <div className="h-64 bg-zinc-200 dark:bg-zinc-800"></div>
              <div className="p-6 space-y-3">
                <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="text-center py-20 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30">
          <ImageIcon className="w-14 h-14 mx-auto text-zinc-400 stroke-1 mb-3" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            {t('albums.empty')}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.' : 'Các bộ ảnh sự kiện và đời sống sẽ sớm được cập nhật.'}
          </p>
        </div>
      ) : filteredAlbums.length === 1 && !searchQuery ? (
        /* FEATURED HERO CARD KHI CHỈ CÓ 1 ALBUM (Tránh lỗi nửa phải bị trống) */
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <span>{t('albums.featured')}</span>
          </div>

          {filteredAlbums.map((album) => {
            const previewPhotos = album.preview_photos || [];
            return (
              <Link
                key={album.id}
                to={`/album/${album.slug}`}
                className="group relative rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-0"
              >
                {/* Cột ảnh lớn bên trái */}
                <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-[420px] overflow-hidden bg-zinc-900">
                  <img
                    src={album.cover_image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {/* Gradient overlay đáy ảnh bảo vệ tương phản */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                  {/* Badge số ảnh trên nền tối mờ */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 shadow-lg">
                    <Camera className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{album.photo_count} {t('albums.photos_count')}</span>
                  </div>

                  {/* Thumbnail xếp chồng góc dưới xem trước ảnh bên trong */}
                  {previewPhotos.length > 0 && (
                    <div className="absolute bottom-4 left-4 flex items-center -space-x-3 hover:space-x-1 transition-all duration-300">
                      {previewPhotos.slice(0, 3).map((pUrl, idx) => (
                        <div
                          key={idx}
                          className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/90 dark:border-zinc-800 shadow-lg bg-zinc-900 transition-transform group-hover:translate-y-0"
                          style={{ transform: `rotate(${(idx - 1) * 6}deg)` }}
                        >
                          <img src={pUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {album.photo_count > 3 && (
                        <div className="w-12 h-12 rounded-xl bg-black/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center justify-center border-2 border-white/90 shadow-lg">
                          +{album.photo_count - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cột thông tin chi tiết bên phải */}
                <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{formatAlbumDate(album.event_date || album.created_at)}</span>
                    </div>

                    <h2
                      title={album.title}
                      className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 [text-wrap:balance]"
                    >
                      {album.title}
                    </h2>

                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-4">
                      {album.description || 'Khám phá trọn vẹn bộ ảnh chi tiết với chất lượng cao và giao diện trình chiếu toàn màn hình.'}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-medium">
                      Chế độ xem tương tác & Lightbox
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                      <span>{t('albums.explore')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* LƯỚI CARD KHI CÓ TỪ 2 ALBUM TRỞ LÊN */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAlbums.map((album) => {
            const previewPhotos = album.preview_photos || [];
            return (
              <Link
                key={album.id}
                to={`/album/${album.slug}`}
                className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
              >
                {/* Khối ảnh bìa */}
                <div className="h-60 sm:h-64 overflow-hidden bg-zinc-900 relative">
                  <img
                    src={album.cover_image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80'}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Gradient tối đáy ảnh */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Badge số ảnh trên nền tối mờ */}
                  <span className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-mono font-medium flex items-center gap-1.5 border border-white/20 shadow-md">
                    <Camera className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{album.photo_count} {t('albums.photos_count')}</span>
                  </span>

                  {/* Preview thumbnails nhỏ ở chân ảnh bìa */}
                  {previewPhotos.length > 1 && (
                    <div className="absolute bottom-3 left-3 flex items-center -space-x-2">
                      {previewPhotos.slice(0, 3).map((pUrl, idx) => (
                        <div
                          key={idx}
                          className="w-9 h-9 rounded-lg overflow-hidden border-2 border-white/90 dark:border-zinc-800 shadow-md bg-zinc-800"
                        >
                          <img src={pUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nội dung card */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{formatAlbumDate(album.event_date || album.created_at)}</span>
                    </div>

                    <h3
                      title={album.title}
                      className="font-bold text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug [text-wrap:balance]"
                    >
                      {album.title}
                    </h3>

                    <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                      {album.description || 'Bộ sưu tập hình ảnh ghi lại các khoảnh khắc chân thực.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>{t('albums.explore')}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
