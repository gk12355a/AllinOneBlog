import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlock from '@tiptap/extension-code-block';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
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
  CheckSquare,
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
  BookOpen,
  Plus,
  GripVertical,
  Palette,
  RefreshCw,
  Copy,
  Trash2,
  Check,
  ChevronRight,
  ChevronDown,
  Type
} from 'lucide-react';
import { mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

const TEXT_COLORS = [
  { id: 'default', label: 'Mặc định', value: '' },
  { id: 'gray', label: 'Xám', value: '#787774' },
  { id: 'brown', label: 'Nâu', value: '#9f6b53' },
  { id: 'orange', label: 'Cam', value: '#d9730d' },
  { id: 'yellow', label: 'Vàng', value: '#cb912f' },
  { id: 'green', label: 'Xanh lá', value: '#448361' },
  { id: 'blue', label: 'Xanh dương', value: '#337ea9' },
  { id: 'purple', label: 'Tím', value: '#9065b0' },
  { id: 'pink', label: 'Hồng', value: '#c14c8a' },
  { id: 'red', label: 'Đỏ', value: '#d44c47' }
];

const BG_COLORS = [
  { id: 'default', label: 'Không nền', value: '' },
  { id: 'gray', label: 'Nền xám', value: 'rgba(120, 119, 116, 0.18)' },
  { id: 'brown', label: 'Nền nâu', value: 'rgba(159, 107, 83, 0.18)' },
  { id: 'orange', label: 'Nền cam', value: 'rgba(217, 115, 13, 0.18)' },
  { id: 'yellow', label: 'Nền vàng', value: 'rgba(203, 145, 47, 0.22)' },
  { id: 'green', label: 'Nền xanh lá', value: 'rgba(68, 131, 97, 0.18)' },
  { id: 'blue', label: 'Nền xanh dương', value: 'rgba(51, 126, 169, 0.18)' },
  { id: 'purple', label: 'Nền tím', value: 'rgba(144, 101, 176, 0.18)' },
  { id: 'pink', label: 'Nền hồng', value: 'rgba(193, 76, 138, 0.18)' },
  { id: 'red', label: 'Nền đỏ', value: 'rgba(212, 76, 71, 0.18)' }
];

const CODE_LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'css', label: 'CSS' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'go', label: 'Go' },
  { value: 'html', label: 'HTML' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'lua', label: 'Lua' },
  { value: 'makefile', label: 'Makefile' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'php', label: 'PHP' },
  { value: 'python', label: 'Python' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'scss', label: 'SCSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'swift', label: 'Swift' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' }
];

function NotionCodeBlock({ node, updateAttributes }) {
  const [copied, setCopied] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const langMenuRef = useRef(null);

  const language = node.attrs.language || 'plaintext';
  const currentLangLabel = CODE_LANGUAGES.find((l) => l.value === language)?.label || language;

  useEffect(() => {
    if (!langMenuOpen) return;
    const handleOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setLangMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [langMenuOpen]);

  const filteredLangs = useMemo(() => {
    if (!langSearch.trim()) return CODE_LANGUAGES;
    const q = langSearch.toLowerCase();
    return CODE_LANGUAGES.filter((l) => l.label.toLowerCase().includes(q) || l.value.includes(q));
  }, [langSearch]);

  const handleCopy = () => {
    navigator.clipboard.writeText(node.textContent || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <NodeViewWrapper className="relative group my-3">
      <div
        contentEditable={false}
        className="flex items-center justify-between px-3 py-1.5 rounded-t-xl bg-zinc-200/70 dark:bg-zinc-800/90 border border-b-0 border-zinc-200 dark:border-zinc-700 text-xs"
      >
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => {
              setLangMenuOpen(!langMenuOpen);
              setLangSearch('');
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-zinc-300/60 dark:hover:bg-zinc-700 font-medium text-zinc-700 dark:text-zinc-200 transition"
          >
            <span>{currentLangLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          {langMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 p-1.5">
              <input
                type="text"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Search for a language..."
                autoFocus
                className="w-full px-2.5 py-1.5 mb-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {filteredLangs.map((langOpt) => (
                  <button
                    key={langOpt.value}
                    type="button"
                    onClick={() => {
                      updateAttributes({ language: langOpt.value });
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      language === langOpt.value
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{langOpt.label}</span>
                    {language === langOpt.value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
                {filteredLangs.length === 0 && (
                  <div className="px-2.5 py-2 text-xs text-zinc-400 text-center">No language found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-zinc-300/60 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

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

  // Block side menu (+ and ⋮⋮) & Block action popover
  const [hoveredBlock, setHoveredBlock] = useState({ top: 0, pos: null, visible: false });
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [blockMenuSearch, setBlockMenuSearch] = useState('');
  const [activeSubmenu, setActiveSubmenu] = useState(null); // 'turn_into' | 'color' | null
  const [lastUsedColor, setLastUsedColor] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('notion_last_color') || 'null');
    } catch {
      return null;
    }
  });

  // Bubble toolbar state (when selecting text)
  const [bubblePos, setBubblePos] = useState({ open: false, top: 0, left: 0 });

  const fileInputRef = useRef(null);
  const editorContainerRef = useRef(null);
  const blockMenuRef = useRef(null);
  const draggedBlockPosRef = useRef(null);
  const isInternalUpdate = useRef(false);
  const [dropIndicator, setDropIndicator] = useState({ visible: false, top: 0, targetPos: null });

  // Đóng Block Action Menu khi bấm ra ngoài hoặc nhấn Escape
  useEffect(() => {
    if (!blockMenuOpen) return;
    const handleClickOutside = (e) => {
      if (blockMenuRef.current && !blockMenuRef.current.contains(e.target)) {
        setBlockMenuOpen(false);
        setActiveSubmenu(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setBlockMenuOpen(false);
        setActiveSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [blockMenuOpen]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false
      }),
      CodeBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(NotionCodeBlock);
        }
      }),
      Placeholder.configure({
        placeholder: placeholder || (lang === 'vi'
          ? 'Nhập nội dung hoặc gõ "/" để chèn block (tiêu đề, to-do, code, ảnh)...'
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
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
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
        class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[360px] pl-14 pr-5 py-4 text-sm sm:text-base leading-relaxed'
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
        if (draggedBlockPosRef.current !== null) {
          return true;
        }
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
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to, empty } = ed.state.selection;
      if (empty || from === to || !editorContainerRef.current) {
        setBubblePos((prev) => (prev.open ? { ...prev, open: false } : prev));
        return;
      }
      try {
        const start = ed.view.coordsAtPos(from);
        const end = ed.view.coordsAtPos(to);
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        const scrollTop = editorContainerRef.current.scrollTop;
        const left = Math.max(12, Math.min((start.left + end.left) / 2 - containerRect.left - 110, containerRect.width - 240));
        const spaceAbove = start.top - containerRect.top;
        // Nếu dòng ở sát mép trên (không đủ chỗ phía trên), tự động đẩy Bubble Toolbar xuống dưới dòng đang chọn để không đè chữ
        const top = spaceAbove >= 48
          ? spaceAbove + scrollTop - 44
          : (end.bottom - containerRect.top) + scrollTop + 8;
        setBubblePos({ open: true, top, left });
      } catch {
        setBubblePos((prev) => (prev.open ? { ...prev, open: false } : prev));
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
        setSlashMenu({
          open: true,
          query: match[1].toLowerCase(),
          selectedIndex: 0
        });
      } else if (slashMenu.open) {
        setSlashMenu({ open: false, query: '', selectedIndex: 0 });
      }
    }
  });

  // Sync external value changes
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

  // Track hovered block for Notion Side Menu (+ and ⋮⋮)
  const handleEditorMouseMove = (e) => {
    if (!editor || !editorContainerRef.current || blockMenuOpen) return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const blockEl = target.closest('.ProseMirror > *');
    if (!blockEl) return;

    const containerRect = editorContainerRef.current.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    const top = blockRect.top - containerRect.top + editorContainerRef.current.scrollTop;

    let pos = null;
    try {
      pos = editor.view.posAtDOM(blockEl, 0);
    } catch {
      pos = null;
    }
    setHoveredBlock({ top: Math.max(8, top), pos, visible: true });
  };

  // Kéo thả block bằng nút ⋮⋮ (Drag & Drop)
  const handleDragStart = (e) => {
    if (hoveredBlock.pos === null) return;
    draggedBlockPosRef.current = hoveredBlock.pos;
    setBlockMenuOpen(false);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-notion-block', '1');
  };

  const handleContainerDragOver = (e) => {
    if (draggedBlockPosRef.current === null || !editor || !editorContainerRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const blockEl = target.closest('.ProseMirror > *');
    if (!blockEl) return;

    const containerRect = editorContainerRef.current.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    const isAfter = e.clientY > blockRect.top + blockRect.height / 2;
    const lineTop = (isAfter ? blockRect.bottom : blockRect.top) - containerRect.top + editorContainerRef.current.scrollTop;

    try {
      const domPos = editor.view.posAtDOM(blockEl, 0);
      const $pos = editor.state.doc.resolve(domPos);
      const targetPos = isAfter ? $pos.after(1) : $pos.before(1);
      setDropIndicator({ visible: true, top: lineTop, targetPos });
    } catch {
      // ignore
    }
  };

  const handleContainerDrop = (e) => {
    if (draggedBlockPosRef.current === null || !editor) return;
    e.preventDefault();

    const fromPos = draggedBlockPosRef.current;
    const toPos = dropIndicator.targetPos;
    draggedBlockPosRef.current = null;
    setDropIndicator({ visible: false, top: 0, targetPos: null });

    if (toPos === null || toPos === undefined) return;

    try {
      const { state, view } = editor;
      const $from = state.doc.resolve(fromPos);
      const node = $from.node(1);
      const start = $from.before(1);
      const end = $from.after(1);

      if (!node || (toPos >= start && toPos <= end)) return;

      let tr = state.tr.delete(start, end);
      const mappedTo = tr.mapping.map(toPos);
      tr = tr.insert(mappedTo, node);
      view.dispatch(tr.scrollIntoView());
    } catch {
      // ignore invalid drop
    }
  };

  const handleContainerDragEnd = () => {
    draggedBlockPosRef.current = null;
    setDropIndicator({ visible: false, top: 0, targetPos: null });
  };

  const turnIntoOptions = useMemo(() => [
    {
      id: 'text',
      label: lang === 'vi' ? 'Văn bản (Text)' : 'Text',
      icon: Type,
      isActive: (ed) => ed.isActive('paragraph') && !ed.isActive('bulletList') && !ed.isActive('orderedList') && !ed.isActive('taskList'),
      action: (ed) => ed.chain().focus().setParagraph().run()
    },
    {
      id: 'h1',
      label: lang === 'vi' ? 'Tiêu đề 1 (H1)' : 'Heading 1',
      icon: Heading1,
      isActive: (ed) => ed.isActive('heading', { level: 1 }),
      action: (ed) => ed.chain().focus().setHeading({ level: 1 }).run()
    },
    {
      id: 'h2',
      label: lang === 'vi' ? 'Tiêu đề 2 (H2)' : 'Heading 2',
      icon: Heading2,
      isActive: (ed) => ed.isActive('heading', { level: 2 }),
      action: (ed) => ed.chain().focus().setHeading({ level: 2 }).run()
    },
    {
      id: 'h3',
      label: lang === 'vi' ? 'Tiêu đề 3 (H3)' : 'Heading 3',
      icon: Heading3,
      isActive: (ed) => ed.isActive('heading', { level: 3 }),
      action: (ed) => ed.chain().focus().setHeading({ level: 3 }).run()
    },
    {
      id: 'bullet',
      label: lang === 'vi' ? 'Danh sách chấm' : 'Bulleted list',
      icon: List,
      isActive: (ed) => ed.isActive('bulletList'),
      action: (ed) => ed.chain().focus().toggleBulletList().run()
    },
    {
      id: 'ordered',
      label: lang === 'vi' ? 'Danh sách số' : 'Numbered list',
      icon: ListOrdered,
      isActive: (ed) => ed.isActive('orderedList'),
      action: (ed) => ed.chain().focus().toggleOrderedList().run()
    },
    {
      id: 'todo',
      label: lang === 'vi' ? 'Danh sách việc cần làm (To-do)' : 'To-do list',
      icon: CheckSquare,
      isActive: (ed) => ed.isActive('taskList'),
      action: (ed) => ed.chain().focus().toggleTaskList().run()
    },
    {
      id: 'code',
      label: lang === 'vi' ? 'Khối Code' : 'Code',
      icon: Code,
      isActive: (ed) => ed.isActive('codeBlock'),
      action: (ed) => ed.chain().focus().toggleCodeBlock().run()
    },
    {
      id: 'quote',
      label: lang === 'vi' ? 'Trích dẫn / Callout' : 'Quote / Callout',
      icon: Quote,
      isActive: (ed) => ed.isActive('blockquote'),
      action: (ed) => ed.chain().focus().toggleBlockquote().run()
    }
  ], [lang]);

  const slashCommands = useMemo(() => [
    ...turnIntoOptions.map((item) => ({
      ...item,
      keywords: item.id + ' ' + item.label.toLowerCase()
    })),
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
  ], [turnIntoOptions, lang]);

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
    const deleteLen = slashMenu.query.length + 1;
    editor.chain().focus().deleteRange({ from: Math.max(0, from - deleteLen), to: from }).run();
    cmd.action(editor);
    setSlashMenu({ open: false, query: '', selectedIndex: 0 });
  };

  const applyColor = (type, colorObj) => {
    if (!editor) return;
    if (hoveredBlock.pos !== null && editor.state.selection.empty) {
      editor.chain().focus().setTextSelection(hoveredBlock.pos).selectParentNode().run();
    }
    if (type === 'text') {
      if (colorObj.value) {
        editor.chain().focus().setColor(colorObj.value).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
    } else {
      if (colorObj.value) {
        editor.chain().focus().setHighlight({ color: colorObj.value }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
    }
    const saved = { type, ...colorObj };
    setLastUsedColor(saved);
    localStorage.setItem('notion_last_color', JSON.stringify(saved));
    setBlockMenuOpen(false);
    setActiveSubmenu(null);
  };

  const handleInsertBlockBelow = () => {
    if (!editor) return;
    if (hoveredBlock.pos !== null) {
      editor.chain().focus().setTextSelection(hoveredBlock.pos).run();
    }
    editor.chain().focus().createParagraphNear().insertContent('/').run();
  };

  const handleDuplicateBlock = () => {
    if (!editor) return;
    try {
      const { state } = editor;
      const pos = hoveredBlock.pos ?? state.selection.from;
      const $pos = state.doc.resolve(pos);
      const node = $pos.node(1) || $pos.parent;
      if (node) {
        const endPos = $pos.after(1);
        editor.chain().focus().insertContentAt(endPos, node.toJSON()).run();
      }
    } catch {
      // ignore
    }
    setBlockMenuOpen(false);
  };

  const handleDeleteBlock = () => {
    if (!editor) return;
    try {
      const { state } = editor;
      const pos = hoveredBlock.pos ?? state.selection.from;
      const $pos = state.doc.resolve(pos);
      const start = $pos.before(1);
      const end = $pos.after(1);
      editor.chain().focus().deleteRange({ from: start, to: end }).run();
    } catch {
      editor.chain().focus().deleteSelection().run();
    }
    setBlockMenuOpen(false);
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
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`p-1.5 rounded-lg text-xs transition ${editor.isActive('taskList') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}`}
                title="To-do List"
              >
                <CheckSquare className="w-4 h-4" />
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

        {/* Right Controls */}
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
      <div
        ref={editorContainerRef}
        onMouseMove={handleEditorMouseMove}
        onMouseLeave={() => {
          if (!blockMenuOpen) setHoveredBlock((prev) => ({ ...prev, visible: false }));
        }}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        onDragEnd={handleContainerDragEnd}
        className={`relative ${isFocusMode ? 'flex-1 overflow-y-auto' : 'max-h-[520px] overflow-y-auto'}`}
      >
        {mode === 'notion' ? (
          <div className="relative">
            {/* Notion Side Menu (+ and ⋮⋮) */}
            {hoveredBlock.visible && (
              <div
                style={{ top: hoveredBlock.top }}
                className="absolute left-2 z-20 flex items-center gap-0.5 transition-all duration-75"
              >
                <button
                  type="button"
                  onClick={handleInsertBlockBelow}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                  title={lang === 'vi' ? 'Thêm block bên dưới' : 'Add block below'}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  draggable
                  onDragStart={handleDragStart}
                  onClick={() => {
                    setBlockMenuOpen(!blockMenuOpen);
                    setActiveSubmenu(null);
                    setBlockMenuSearch('');
                  }}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-grab active:cursor-grabbing"
                  title={lang === 'vi' ? 'Kéo để di chuyển • Bấm để mở menu block' : 'Drag to move • Click for menu'}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Drop Indicator Line */}
            {dropIndicator.visible && (
              <div
                style={{ top: dropIndicator.top }}
                className="absolute left-10 right-4 h-0.5 bg-indigo-500 rounded-full z-30 pointer-events-none shadow-sm"
              />
            )}

            {/* Block Action Menu Popover (Turn into, Color, Duplicate, Delete) */}
            {blockMenuOpen && (
              <div
                ref={blockMenuRef}
                style={{ top: hoveredBlock.top + 26 }}
                className="absolute left-4 z-40 w-60 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-1.5 text-xs"
              >
                <input
                  type="text"
                  value={blockMenuSearch}
                  onChange={(e) => setBlockMenuSearch(e.target.value)}
                  placeholder="Search actions..."
                  autoFocus
                  className="w-full px-2.5 py-1.5 mb-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />

                {/* Turn into */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu(activeSubmenu === 'turn_into' ? null : 'turn_into')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Turn into</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  {activeSubmenu === 'turn_into' && (
                    <div className="mt-1 ml-2 pl-2 border-l border-zinc-200 dark:border-zinc-800 space-y-0.5 max-h-56 overflow-y-auto">
                      {turnIntoOptions
                        .filter((opt) => !blockMenuSearch || opt.label.toLowerCase().includes(blockMenuSearch.toLowerCase()))
                        .map((opt) => {
                          const Icon = opt.icon;
                          const active = editor ? opt.isActive(editor) : false;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (editor && hoveredBlock.pos !== null) {
                                  editor.chain().focus().setTextSelection(hoveredBlock.pos).run();
                                }
                                opt.action(editor);
                                setBlockMenuOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-200"
                            >
                              <span className="flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5 text-zinc-400" />
                                <span>{opt.label}</span>
                              </span>
                              {active && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Color */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu(activeSubmenu === 'color' ? null : 'color')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Color</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  {activeSubmenu === 'color' && (
                    <div className="mt-1 ml-2 pl-2 border-l border-zinc-200 dark:border-zinc-800 space-y-2 max-h-64 overflow-y-auto p-1">
                      {lastUsedColor && (
                        <div>
                          <div className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Last used</div>
                          <button
                            type="button"
                            onClick={() => applyColor(lastUsedColor.type, lastUsedColor)}
                            className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <span
                              className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold"
                              style={{
                                color: lastUsedColor.type === 'text' ? lastUsedColor.value : undefined,
                                backgroundColor: lastUsedColor.type === 'bg' ? lastUsedColor.value : undefined
                              }}
                            >
                              A
                            </span>
                            <span>{lastUsedColor.label}</span>
                          </button>
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Text color</div>
                        <div className="grid grid-cols-5 gap-1">
                          {TEXT_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => applyColor('text', c)}
                              title={c.label}
                              className="h-7 rounded border border-zinc-200 dark:border-zinc-800 hover:scale-105 transition flex items-center justify-center font-bold text-xs"
                              style={{ color: c.value || 'inherit' }}
                            >
                              A
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Background color</div>
                        <div className="grid grid-cols-5 gap-1">
                          {BG_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => applyColor('bg', c)}
                              title={c.label}
                              className="h-7 rounded border border-zinc-200 dark:border-zinc-800 hover:scale-105 transition flex items-center justify-center text-xs"
                              style={{ backgroundColor: c.value || 'transparent' }}
                            >
                              {!c.value && '∅'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />

                <button
                  type="button"
                  onClick={handleDuplicateBlock}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                >
                  <span className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Duplicate</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Ctrl+D</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteBlock}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </span>
                  <span className="text-[10px] opacity-70 font-mono">Del</span>
                </button>
              </div>
            )}

            {/* Bubble Toolbar (when selecting text) */}
            {bubblePos.open && editor && (
              <div
                style={{ top: bubblePos.top, left: bubblePos.left }}
                className="absolute z-40 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white shadow-2xl border border-zinc-700"
              >
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded-lg hover:bg-zinc-700 ${editor.isActive('bold') ? 'text-indigo-400' : ''}`}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded-lg hover:bg-zinc-700 ${editor.isActive('italic') ? 'text-indigo-400' : ''}`}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  className={`p-1.5 rounded-lg hover:bg-zinc-700 ${editor.isActive('code') ? 'text-indigo-400' : ''}`}
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleSetLink}
                  className={`p-1.5 rounded-lg hover:bg-zinc-700 ${editor.isActive('link') ? 'text-indigo-400' : ''}`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyColor('text', { id: 'red', label: 'Đỏ', value: '#d44c47' })}
                  className="px-1.5 py-1 rounded-lg hover:bg-zinc-700 text-xs font-bold text-red-400"
                  title="Chữ đỏ"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => applyColor('bg', { id: 'yellow', label: 'Nền vàng', value: 'rgba(203, 145, 47, 0.28)' })}
                  className="px-1.5 py-1 rounded-lg hover:bg-zinc-700 text-xs font-bold bg-amber-500/30 text-amber-200"
                  title="Highlight vàng"
                >
                  H
                </button>
              </div>
            )}

            <EditorContent editor={editor} />

            {/* Slash Command Floating Menu */}
            {slashMenu.open && filteredCommands.length > 0 && (
              <div className="sticky bottom-3 left-4 ml-12 mb-3 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-30 p-1.5 max-h-64 overflow-y-auto">
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
              className="p-4 notion-preview max-w-none text-sm overflow-y-auto"
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
            ? 'Rê chuột vào dòng để mở (+ / ⋮⋮) • Bôi đen để định dạng • Gõ "/" để chèn block'
            : 'Hover line for (+ / ⋮⋮) • Select text to format • Type "/" for blocks'}
        </div>
      </div>
    </div>
  );
}
