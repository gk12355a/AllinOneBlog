import React, { useState, useEffect } from 'react';
import { Video as VideoIcon, Play, ExternalLink } from 'lucide-react';
import api from '../services/api';

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    api.get('/videos')
      .then(res => setVideos(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Helper chuyển đổi URL YouTube thành Embed URL
  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
  };

  return (
    <div className="space-y-10 py-10 animate-fade-in">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Thư Viện Video Showcase
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base">
          Các video hướng dẫn lập trình, demo sản phẩm thực tế và vlog công nghệ.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>)}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 space-y-2">
          <VideoIcon className="w-12 h-12 mx-auto stroke-1" />
          <p className="text-base font-medium">Chưa có video nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedVideo(v)}
              className="group cursor-pointer rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all hover:shadow-xl flex flex-col"
            >
              {/* Thumbnail Container with Play Overlay */}
              <div className="h-44 overflow-hidden bg-zinc-950 relative">
                <img
                  src={v.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'}
                  alt={v.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>
                <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/70 text-white text-[11px] font-mono">
                  {v.category}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {v.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {v.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal Player */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-zinc-800 text-white">
              <h3 className="font-bold text-sm sm:text-base truncate">{selectedVideo.title}</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
            <div className="relative pt-[56.25%] bg-black">
              <iframe
                src={getEmbedUrl(selectedVideo.video_url)}
                title={selectedVideo.title}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
