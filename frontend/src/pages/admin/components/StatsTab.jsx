import React from 'react';
import { useApp } from '../../../contexts/AppContext';

export default function StatsTab({ stats }) {
  const { t } = useApp();

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t('admin.total_views')}
          </span>
          <p className="text-3xl font-extrabold mt-2 text-indigo-600 dark:text-indigo-400">
            {stats.total_views}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t('admin.published_posts')}
          </span>
          <p className="text-3xl font-extrabold mt-2 text-zinc-900 dark:text-zinc-100">
            {stats.total_posts}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t('admin.projects_videos')}
          </span>
          <p className="text-3xl font-extrabold mt-2 text-zinc-900 dark:text-zinc-100">
            {stats.total_projects} / {stats.total_videos}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t('admin.unread_messages')}
          </span>
          <p className="text-3xl font-extrabold mt-2 text-amber-500">
            {stats.unread_messages}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
        <h3 className="text-base font-bold mb-4">{t('admin.top_posts')}</h3>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {stats.top_posts?.map((p) => (
            <div key={p.id} className="py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate pr-4">
                {p.title}
              </span>
              <span className="text-xs font-semibold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 shrink-0">
                {p.views} views
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
