import React, { useState } from 'react';
import { Copy, Check, Send } from 'lucide-react';
import { FacebookIcon, TwitterXIcon, LinkedinIcon } from './SocialIcons';

export function ShareButtons({ title, url = window.location.href, className = "" }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title || document.title);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const openShare = (shareLink) => {
    window.open(shareLink, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Copy Link Button */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        title="Sao chép liên kết bài viết"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500 font-medium">Đã sao chép!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </>
        )}
      </button>

      {/* Facebook */}
      <button
        onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`)}
        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
        title="Chia sẻ lên Facebook"
      >
        <FacebookIcon className="w-4 h-4" />
      </button>

      {/* Twitter / X */}
      <button
        onClick={() => openShare(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`)}
        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
        title="Chia sẻ lên X (Twitter)"
      >
        <TwitterXIcon className="w-4 h-4" />
      </button>

      {/* LinkedIn */}
      <button
        onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`)}
        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
        title="Chia sẻ lên LinkedIn"
      >
        <LinkedinIcon className="w-4 h-4" />
      </button>

      {/* Telegram */}
      <button
        onClick={() => openShare(`https://t.me/share/url?url=${shareUrl}&text=${shareTitle}`)}
        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
        title="Chia sẻ lên Telegram"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ShareButtons;
