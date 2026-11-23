import React, { useState } from 'react';
import api from '../services/api';

const reactionConfig = [
  { type: 'fire', icon: '🔥', label: 'Tuyệt vời' },
  { type: 'heart', icon: '❤️', label: 'Yêu thích' },
  { type: 'idea', icon: '💡', label: 'Bổ ích' },
  { type: 'rocket', icon: '🚀', label: 'Truyền cảm hứng' }
];

export default function ReactionBar({ slug, initialReactions }) {
  const [reactions, setReactions] = useState(initialReactions || { fire: 0, heart: 0, idea: 0, rocket: 0 });
  const [activeReaction, setActiveReaction] = useState(() => {
    // Lưu reaction hiện tại của độc giả cho bài viết này (giống Facebook: chỉ chọn 1 biểu cảm tại 1 thời điểm)
    return localStorage.getItem(`reaction_${slug}`) || null;
  });

  const handleReact = async (type) => {
    const isCurrentlyActive = activeReaction === type;
    const previousReaction = activeReaction;

    // 1. Nếu click vào chính reaction đang chọn -> Hủy thả cảm xúc (Toggle OFF)
    if (isCurrentlyActive) {
      setReactions(prev => ({
        ...prev,
        [type]: Math.max(0, (prev[type] || 0) - 1)
      }));
      setActiveReaction(null);
      localStorage.removeItem(`reaction_${slug}`);

      try {
        const res = await api.post(`/posts/${slug}/reactions`, { type, action: 'remove' });
        const resData = res?.data || res;
        if (resData) setReactions(resData);
      } catch (err) {
        console.error(err);
      }
    } 
    // 2. Nếu chuyển sang reaction khác hoặc thả mới lần đầu
    else {
      setReactions(prev => {
        const updated = { ...prev, [type]: (prev[type] || 0) + 1 };
        // Nếu trước đó đã thả một reaction khác thì giảm số lượng của reaction cũ
        if (previousReaction && prev[previousReaction] > 0) {
          updated[previousReaction] = Math.max(0, prev[previousReaction] - 1);
        }
        return updated;
      });
      setActiveReaction(type);
      localStorage.setItem(`reaction_${slug}`, type);

      try {
        // Nếu có reaction cũ, hủy reaction cũ ở server
        if (previousReaction) {
          await api.post(`/posts/${slug}/reactions`, { type: previousReaction, action: 'remove' });
        }
        const res = await api.post(`/posts/${slug}/reactions`, { type, action: 'add' });
        const resData = res?.data || res;
        if (resData) setReactions(resData);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-4 flex-wrap">
      {reactionConfig.map(({ type, icon, label }) => {
        const count = reactions[type] || 0;
        const isSelected = activeReaction === type;

        return (
          <button
            key={type}
            onClick={() => handleReact(type)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all hover:scale-105 active:scale-95 ${
              isSelected
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-sm ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80'
            }`}
            title={label}
          >
            <span className="text-base">{icon}</span>
            <span className="font-semibold text-xs">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
