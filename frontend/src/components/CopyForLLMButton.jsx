import React, { useState } from 'react';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function CopyForLLMButton({ getMarkdown, label, className = '' }) {
  const { lang, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const text = await getMarkdown();
      if (!text) {
        showToast(lang === 'vi' ? 'Không có nội dung để copy.' : 'Nothing to copy.', 'error');
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(lang === 'vi' ? 'Đã copy định dạng Markdown cho LLM!' : 'Copied for LLM!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast(err?.message || (lang === 'vi' ? 'Không thể copy vào clipboard.' : 'Copy failed.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition disabled:opacity-50 ${className}`}
      title={lang === 'vi' ? 'Copy toàn bộ nội dung chuẩn Markdown cho ChatGPT / Claude / Gemini' : 'Copy full Markdown context for LLMs'}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      <span>{copied ? (lang === 'vi' ? 'Đã copy!' : 'Copied!') : (label || 'Copy for LLM')}</span>
    </button>
  );
}
