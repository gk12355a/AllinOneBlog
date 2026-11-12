import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden my-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-sm shadow-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
        <span className="font-semibold uppercase tracking-wider text-blue-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800 text-zinc-300 transition-colors"
          title="Sao chép mã"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã chép!' : 'Chép code'}</span>
        </button>
      </div>

      {/* Code Area */}
      <pre className="p-4 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
