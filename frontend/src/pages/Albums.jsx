import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Camera, Calendar } from 'lucide-react';
import api from '../services/api';

export default function Albums() {
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/albums')
      .then(res => setAlbums(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-10 py-10 animate-fade-in">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Bộ Sưu Tập Nhiếp Ảnh & Albums
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base">
          Ghi lại những khoảnh khắc đời sống, chuyến đi và các sự kiện công nghệ đáng nhớ.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>)}
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 space-y-2">
          <ImageIcon className="w-12 h-12 mx-auto stroke-1" />
          <p className="text-base font-medium">Chưa có album nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <Link
              key={album.id}
              to={`/album/${album.slug}`}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all hover:shadow-xl flex flex-col"
            >
              <div className="h-56 overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative">
                <img
                  src={album.cover_image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80'}
                  alt={album.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-mono flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{album.photo_count} ảnh</span>
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {album.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                    {album.description}
                  </p>
                </div>

                <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  <Calendar className="w-3 h-3" />
                  <span>{album.created_at ? new Date(album.created_at).toLocaleDateString() : '2026'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
