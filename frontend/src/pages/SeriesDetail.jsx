import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function SeriesDetail() {
  const { slug } = useParams();
  const [series, setSeries] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get(`/series/${slug}`)
      .then(res => setSeries(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return <div className="max-w-4xl mx-auto py-16 text-center text-zinc-400">Đang tải chuỗi bài viết...</div>;
  }

  if (!series) {
    return <div className="text-center py-20">Không tìm thấy series.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-10 animate-fade-in">
      <Link
        to="/series"
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Tất cả các chuỗi bài</span>
      </Link>

      {/* Series Hero Header */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {series.title}
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
          {series.description}
        </p>
      </div>

      {/* Posts Roadmap List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Danh sách bài viết trong lộ trình ({series.posts?.length || 0})</span>
        </h2>

        <div className="space-y-3">
          {series.posts?.map((post, idx) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base line-clamp-1">
                    {post.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 ml-4" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
