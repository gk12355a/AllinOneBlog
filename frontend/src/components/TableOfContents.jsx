import React, { useState, useEffect } from 'react';
import { AlignLeft } from 'lucide-react';

export default function TableOfContents({ content }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    // Trích xuất các tiêu đề H2 và H3 từ Markdown content
    if (!content) return;

    const regex = /^(#{2,3})\s+(.+)$/gm;
    const extracted = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      extracted.push({ level, title, id });
    }

    setHeadings(extracted);
  }, [content]);

  useEffect(() => {
    const handleScroll = () => {
      const headingElements = headings.map(h => document.getElementById(h.id)).filter(Boolean);
      const scrollPosition = window.scrollY + 100;

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const el = headingElements[i];
        if (el.offsetTop <= scrollPosition) {
          setActiveId(el.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-sm">
      <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100 mb-3 text-xs uppercase tracking-wider">
        <AlignLeft className="w-4 h-4 text-blue-500" />
        <span>Trong trang này</span>
      </div>
      <nav className="space-y-1.5 max-h-[70vh] overflow-y-auto">
        {headings.map((h, idx) => (
          <a
            key={idx}
            href={`#${h.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
              setActiveId(h.id);
            }}
            className={`block transition-colors line-clamp-1 ${
              h.level === 3 ? 'pl-4 text-xs' : 'text-sm font-medium'
            } ${
              activeId === h.id
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {h.title}
          </a>
        ))}
      </nav>
    </div>
  );
}
