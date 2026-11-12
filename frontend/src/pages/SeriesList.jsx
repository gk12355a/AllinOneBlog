import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ChevronRight, BookOpen } from 'lucide-react';
import api from '../services/api';

export default function SeriesList() {
  const [seriesList, setSeriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/series')
      .then(res => setSeriesList(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-10 py-10 animate-fade-in">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Chuỗi Bài Viết & Lộ Trình Kỹ Thuật (Series)
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base">
          Các bài viết và video được sắp xếp theo đúng thứ tự logic từ bài đầu đến bài cuối.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="h-60 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>)}
        </div>
      ) : seriesList.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 space-y-2">
          <Layers className="w-12 h-12 mx-auto stroke-1" />
          <p className="text-base font-medium">Chưa có chuỗi bài viết nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {seriesList.map((s) => (
            <Link
              key={s.id}
              to={`/series/${s.slug}`}
              className="group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all hover:shadow-xl flex flex-col"
            >
              {s.cover_image && (
                <div className="h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img src={s.cover_image} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                    <BookOpen className="w-4 h-4" />
                    <span>{s.total_posts} bài viết</span>
                    <span>•</span>
                    <span>{s.total_videos} videos</span>
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {s.title}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3">
                    {s.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span>Khám phá lộ trình</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
