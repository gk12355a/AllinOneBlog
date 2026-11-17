import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ text = 'Đang tải...', fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 p-6">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      {text && <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-zinc-950/70 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
