import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw } from 'lucide-react';

export default function AudioPlayer({ textContent, title }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [utterance, setUtterance] = useState(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      // Loại bỏ các cú pháp Markdown cơ bản trước khi đọc
      const cleanText = textContent
        ?.replace(/#+\s/g, '')
        ?.replace(/[*_`]/g, '')
        ?.replace(/\[(.*?)\]\(.*?\)/g, '$1') || '';

      const u = new SpeechSynthesisUtterance(cleanText);
      u.lang = 'vi-VN';
      u.rate = 1.0;

      u.onend = () => setIsPlaying(false);
      u.onerror = () => setIsPlaying(false);

      setUtterance(u);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [textContent]);

  if (!isSupported) return null;

  const togglePlay = () => {
    if (!utterance) return;

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
      setIsPlaying(true);
    }
  };

  const restartAudio = () => {
    if (!utterance) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-sm my-4">
      <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
      <span className="font-medium text-xs sm:text-sm truncate flex-1">
        Nghe đọc bài viết bằng Audio
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={togglePlay}
          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'Tạm dừng' : 'Nghe ngay'}</span>
        </button>
        {isPlaying && (
          <button
            onClick={restartAudio}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            title="Nghe lại từ đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
