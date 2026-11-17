import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, X, ZoomIn, Calendar, MapPin } from 'lucide-react';
import { mediaApi } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

export default function AlbumDetail() {
  const { slug } = useParams();
  const { t } = useApp();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(null);

  useEffect(() => {
    mediaApi.getAlbum(slug)
      .then(res => {
        const data = res?.data || res;
        if (data) {
          setAlbum(data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">{t('albums.empty')}</h2>
        <Link to="/albums" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> {t('albums.back_to_albums')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link to="/albums" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition mb-6">
        <ArrowLeft className="w-4 h-4" /> {t('albums.back_to_albums')}
      </Link>

      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-zinc-900 dark:text-zinc-100">{album.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-base mb-4">{album.description}</p>
        <div className="flex items-center justify-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(album.created_at).toLocaleDateString()}
          </span>
          <span>•</span>
          <span>{album.photos?.length || 0} {t('albums.photos_count')}</span>
        </div>
      </div>

      {album.photos?.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          {t('albums.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.photos.map((photo) => {
            const photoUrl = photo.photo_url || photo.url;
            return (
              <div
                key={photo.id}
                onClick={() => setActivePhoto(photo)}
                className="group relative cursor-pointer overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 aspect-square shadow-sm hover:shadow-md transition"
              >
                <img
                  src={photoUrl}
                  alt={photo.caption || album.title}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3 text-white">
                  {photo.caption && <p className="text-xs font-medium truncate mb-1">{photo.caption}</p>}
                  <div className="flex items-center justify-between text-[11px] text-zinc-300">
                    <span>{photo.taken_at ? new Date(photo.taken_at).toLocaleDateString() : ''}</span>
                    <ZoomIn className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => setActivePhoto(null)}
            className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={activePhoto.photo_url || activePhoto.url}
              alt={activePhoto.caption || ''}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            {activePhoto.caption && (
              <p className="mt-4 text-center text-sm text-zinc-300 max-w-xl">
                {activePhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
