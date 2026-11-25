import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  FileText,
  Sparkles,
  Columns,
  Eye,
  Loader2,
  Clock,
  BookOpen
} from 'lucide-react';
import { mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

const POST_TEMPLATES = [
  {
    id: 'tutorial',
    labelVi: 'Hướng dẫn kỹ thuật (Tutorial)',
    labelEn: 'Technical Tutorial',
    content: `# Tiêu đề hướng dẫn

## 1. Giới thiệu & Bối cảnh
Mô tả ngắn gọn vấn đề cần giải quyết và mục tiêu của bài viết.

## 2. Yêu cầu chuẩn bị (Prerequisites)
- Công cụ / Phiên bản cần thiết
- Kiến thức nền tảng

## 3. Các bước thực hiện
### Bước 1: Khởi tạo cấu hình
\`\`\`bash
# Nhập lệnh tại đây
\`\`\`

### Bước 2: Triển khai & Kiểm thử
> 💡 **Mẹo:** Ghi chú các điểm quan trọng cần lưu ý ở bước này.

## 4. Tổng kết
Tóm tắt lại kết quả đạt được và tài liệu tham khảo.`
  },
  {
    id: 'devlog',
    labelVi: 'Nhật ký sửa lỗi (Troubleshooting)',
    labelEn: 'Dev Log / Troubleshooting',
    content: `# [DevLog] Cách tôi xử lý lỗi ...

## 1. Hiện tượng gặp phải
Mô tả lỗi thực tế (kèm log hoặc screenshot nếu có).

\`\`\`text
Error: ...
\`\`\`

## 2. Nguyên nhân gốc rễ (Root Cause)
Phân tích tại sao lỗi này xảy ra.

## 3. Giải pháp khắc phục
Các bước đã thực hiện để sửa triệt để:
1. Bước 1...
2. Bước 2...

## 4. Bài học rút ra
Ghi chú để lần sau không lặp lại.`
  },
  {
    id: 'review',
    labelVi: 'Đánh giá / Chia sẻ góc nhìn',
    labelEn: 'Review & Insights',
    content: `# Đánh giá: ...

## 1. Tổng quan
Ấn tượng đầu tiên và lý do sử dụng/trải nghiệm.

## 2. Điểm mạnh (Pros)
- Điểm cộng 1
- Điểm cộng 2

## 3. Điểm hạn chế (Cons)
- Điểm trừ 1

## 4. Kết luận: Có nên dùng không?
Đánh giá tổng kết và đối tượng phù hợp.`
  }
];

export default function NotionEditor({ value = '', onChange, placeholder }) {
  const { lang, showToast } = useApp();
  const [mode, setMode] = useState('notion'); // 'notion' | 'markdown'
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Slash command menu state
  const [slashMenu, setSlashMenu] = useState({ open: false, query: '', selectedIndex: 0 });
  const fileInputRef = useRef(null);
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Placeholder.configure({
        placeholder: placeholder || (lang === 'vi'
          ? 'Nhập nội dung hoặc gõ "/" để mở menu chèn nhanh (tiêu đề, code, ảnh, danh sách)...'
          : 'Write something or type "/" for commands...')
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 dark:text-indigo-400 underline cursor-pointer'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full h-auto my-4 border border-zinc-200 dark:border-zinc-800 shadow-sm'
        }
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true
      })
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[340px] px-5 py-4 text-sm sm:text-base leading-relaxed'
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
          event.preventDefault();
          handleImageUpload(file);
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor: ed }) => {
      isInternalUpdate.current = true;
      const md = ed.storage.markdown.getMarkdown();
      onChange?.(md);

      // Detect "/" slash command at current cursor
      const { state } = ed;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 30), from, '\n', ' ');
      const match = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);
      if (match) {
        setSlashMenu((prev) => ({
          open: true,
          query: match[1].toLowerCase(),
          selectedIndex: 0
        }));
      } else if (slashMenu.open) {
        setSlashMenu({ open: false, query: '', selectedIndex: 0 });
      }
    }
  });

  // Sync external value changes (e.g. switching posts or loading draft)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentMd = editor.storage.markdown.getMarkdown();
    if (value !== currentMd) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apply_watermark', 'false');

    setIsUploading(true);
    try {
      const res = await mediaApi.upload(formData);
      const data = res?.data || res;
      const uploadedUrl = data?.file?.watermarked_url || data?.file?.url || data?.url;
      if (uploadedUrl) {
        if (mode === 'notion' && editor) {
          editor.chain().focus().setImage({ src: uploadedUrl }).run();
        } else {
          onChange?.(`${value || ''}\n\n![image](${uploadedUrl})\n`);
        }
        showToast(lang === 'vi' ? 'Đã tải và chèn ảnh vào bài!' : 'Image uploaded and inserted!');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi tải ảnh lên', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const slashCommands = useMemo(() => [
    {
      id: 'h1',
      label: lang === 'vi' ? 'Tiêu đề lớn (H1)' : 'Heading 1',
      keywords: 'h1 heading 1 tieu de',
      icon: Heading1,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
      id: 'h2',
      label: lang === 'vi' ? 'Tiêu đề vừa (H2)' : 'Heading 2',
      keywords: 'h2 heading 2 tieu de',
      icon: Heading2,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      id: 'h3',
      label: lang === 'vi' ? 'Tiêu đề nhỏ (H3)' : 'Heading 3',
      keywords: 'h3 heading 3 tieu de',
      icon: Heading3,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run()
    },
    {
      id: 'bullet',
      label: lang === 'vi' ? 'Danh sách chấm' : 'Bullet List',
      keywords: 'bullet list danh sach ul',
      icon: List,
      action: (ed) => ed.chain().focus().toggleBulletList().run()
    },
    {
      id: 'ordered',
      label: lang === 'vi' ? 'Danh sách số' : 'Numbered List',
      keywords: 'ordered numbered list danh sach ol',
      icon: ListOrdered,
      action: (ed) => ed.chain().focus().toggleOrderedList().run()
    },
    {
      id: 'quote',
      label: lang === 'vi' ? 'Trích dẫn / Callout' : 'Quote / Callout',
      keywords: 'quote callout trich dan ghi chu',
      icon: Quote,
      action: (ed) => ed.chain().focus().toggleBlockquote().run()
    },
    {
      id: 'code',
      label: lang === 'vi' ? 'Khối Code' : 'Code Block',
      keywords: 'code block ma nguon',
      icon: Code,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run()
    },
    {
      id: 'divider',
      label: lang === 'vi' ? 'Đường kẻ ngang' : 'Divider',
      keywords: 'divider hr duong ke',
      icon: Minus,
      action: (ed) => ed.chain().focus().setHorizontalRule().run()
    },
    {
      id: 'image',
      label: lang === 'vi' ? 'Tải ảnh lên' : 'Upload Image',
      keywords: 'image img anh upload hinh',
      icon: ImageIcon,
      action: () => fileInputRef.current?.click()
    }
  ], [lang]);

  const filteredCommands = useMemo(() => {
    if (!slashMenu.query) return slashCommands;
    return slashCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(slashMenu.query) ||
      cmd.keywords.includes(slashMenu.query)
    );
  }, [slashCommands, slashMenu.query]);

  const executeSlashCommand = (cmd) => {
    if (!editor) return;
    const { state } = editor;
    const { from } = state.selection;
    const deleteLen = slashMenu.query.length + 1; // remove "/query"
    editor.chain().focus().deleteRange({ from: Math.max(0, from - deleteLen), to: from }).run();
    cmd.action(editor);
    setSlashMenu({ open: false, query: '', selectedIndex: 0 });
  };

  const handleSetLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt(lang === 'vi' ? 'Nhập đường dẫn URL:' : 'Enter URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const applyTemplate = (tpl) => {
    if (value && value.trim().length > 20) {
      const ok = window.confirm(
        lang === 'vi'
          ? 'Áp dụng mẫu sẽ thay thế nội dung hiện tại. Bạn có chắc không?'
          : 'Applying a template will replace current content. Continue?'
      );
      if (!ok) return;
    }
    onChange?.(tpl.content);
    if (editor) {
      editor.commands.setContent(tpl.content);
    }
    setShowTemplates(false);
    showToast(lang === 'vi' ? 'Đã chèn mẫu bài viết!' : 'Template applied!');
  };

  // Word count & reading time
  const stats = useMemo(() => {
    const text = (value || '').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, minutes };
  }, [value]);

  const renderedPreview = useMemo(() => {
    if (mode !== 'markdown') return '';
    return DOMPurify.sanitize(marked.parse(value || ''));
  }, [value, mode]);

  return (
    <div
      className={`border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden transition-all ${
        isFocusMode ? 'fixed inset-3 z-[60] flex flex-col shadow-2xl' : 'relative'
      }`}
    >
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
          e.target.value = '';
        }}
      />

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
        <div className="flex flex-wrap items-center gap-1">
          {mode === 'notion' && editor && (
            <>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('bold') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('italic') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('bulletList') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('orderedList') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('blockquote') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Quote / Callout"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('codeBlock') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSetLink}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('link') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition"
                title={lang === 'vi' ? 'Chèn ảnh (hoặc Ctrl+V / kéo thả)' : 'Insert Image'}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <ImageIcon className="w-4 h-4" />}
              </button>
            </>
          )}

          {/* Templates Dropdown */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Mẫu bài' : 'Templates'}</span>
            </button>
            {showTemplates && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-30 p-1.5">
                {POST_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>{lang === 'vi' ? tpl.labelVi : tpl.labelEn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Mode Switcher + Focus Mode */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-zinc-200/70 dark:bg-zinc-800 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('notion')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                mode === 'notion'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Notion</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('markdown')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                mode === 'markdown'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition"
            title={isFocusMode ? (lang === 'vi' ? 'Thoát chế độ tập trung' : 'Exit Focus Mode') : (lang === 'vi' ? 'Chế độ tập trung' : 'Focus Mode')}
          >
            {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className={`relative ${isFocusMode ? 'flex-1 overflow-y-auto' : 'max-h-[500px] overflow-y-auto'}`}>
        {mode === 'notion' ? (
          <div className="relative">
            <EditorContent editor={editor} />

            {/* Slash Command Floating Menu */}
            {slashMenu.open && filteredCommands.length > 0 && (
              <div className="sticky bottom-3 left-4 ml-4 mb-3 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-30 p-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {lang === 'vi' ? 'Chèn nhanh (/)' : 'Insert Block (/)'}
                </div>
                {filteredCommands.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => executeSlashCommand(cmd)}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 transition flex items-center gap-2.5"
                    >
                      <Icon className="w-4 h-4 text-zinc-400" />
                      <span>{cmd.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 min-h-[360px]">
            <textarea
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder="# Nhập Markdown..."
              className="w-full h-full min-h-[360px] p-4 font-mono text-sm bg-transparent focus:outline-none resize-none"
            />
            <div
              className="p-4 prose prose-zinc dark:prose-invert max-w-none text-sm overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: renderedPreview }}
            />
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 text-[11px] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {stats.words} {lang === 'vi' ? 'từ' : 'words'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            ~{stats.minutes} {lang === 'vi' ? 'phút đọc' : 'min read'}
          </span>
        </div>
        <div className="hidden sm:block">
          {lang === 'vi'
            ? 'Mẹo: Gõ "/" để chèn nhanh • Dán (Ctrl+V) hoặc kéo thả ảnh để tự động upload'
            : 'Tip: Type "/" for commands • Paste or drop images to auto-upload'}
        </div>
      </div>
    </div>
  );
}
