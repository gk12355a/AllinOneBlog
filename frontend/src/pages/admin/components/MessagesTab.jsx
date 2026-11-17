import React from 'react';
import { CheckCircle } from 'lucide-react';
import { contentApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

export default function MessagesTab({ messages, onMessagesUpdated }) {
  const { t } = useApp();

  const handleMarkMessageRead = async (id) => {
    try {
      await contentApi.markMessageRead(id);
      if (onMessagesUpdated) onMessagesUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('admin.messages_title')}</h2>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
        {messages.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">{t('admin.no_messages')}</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                m.is_read ? 'opacity-70' : 'bg-indigo-50/20 dark:bg-indigo-950/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{m.sender_name}</span>
                  <span className="text-xs text-zinc-400">&lt;{m.sender_email}&gt;</span>
                  {!m.is_read && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                      {t('admin.new_badge')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">{m.message}</p>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              {!m.is_read && (
                <button
                  onClick={() => handleMarkMessageRead(m.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {t('admin.mark_read')}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
