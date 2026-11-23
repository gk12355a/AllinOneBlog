import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Send, Trash2, Edit2, Loader2, Reply, CornerDownRight,
  Bold, Italic, Code, Quote, Link as LinkIcon, Image as ImageIcon, List
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { postApi, mediaApi } from '../services/api';
import { useApp } from '../contexts/AppContext';

// Cấu hình marked an toàn
marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function CommentSection({ slug }) {
  const { user } = useApp();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState('write'); // 'write', 'preview', 'split'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // States cho chỉnh sửa và trả lời (Reply)
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, username }
  const [replyContent, setReplyContent] = useState('');
  const [isReplyingSubmitting, setIsReplyingSubmitting] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [slug]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const res = await postApi.getComments(slug);
      const data = res?.data || res;
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải bình luận:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    const rawHtml = marked.parse(text);
    return DOMPurify.sanitize(rawHtml);
  };

  // Upload ảnh trực tiếp lên Cloudinary
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chỉ chọn file hình ảnh (PNG, JPG, JPEG, WEBP, GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Dung lượng ảnh tối đa là 10MB.');
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await mediaApi.uploadUserImage(formData);
      const resData = res?.data || res;
      const imageUrl = resData?.url || resData?.watermark_url || resData?.file_url;

      if (imageUrl) {
        const textarea = textareaRef.current;
        const start = textarea ? textarea.selectionStart : content.length;
        const end = textarea ? textarea.selectionEnd : content.length;

        const before = content.substring(0, start);
        const after = content.substring(end);
        const lead = before.endsWith('\n') ? '' : (before.length === 0 ? '' : '\n\n');
        const imgMarkdown = `${lead}![${file.name}](${imageUrl})\n\n`;

        setContent(before + imgMarkdown + after);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Tải ảnh lên thất bại.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyFormat = (formatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);

    let before = val.substring(0, start);
    let after = val.substring(end);
    let insert = '';
    let cursorOffset = 0;

    switch (formatType) {
      case 'bold': {
        const text = selected || 'chữ in đậm';
        const lead = (before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n')) ? ' ' : '';
        const trail = (after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n')) ? ' ' : '';
        insert = `${lead}**${text}**${trail}`;
        cursorOffset = lead.length + 2 + text.length;
        break;
      }
      case 'italic': {
        const text = selected || 'chữ in nghiêng';
        const lead = (before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n')) ? ' ' : '';
        const trail = (after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n')) ? ' ' : '';
        insert = `${lead}*${text}*${trail}`;
        cursorOffset = lead.length + 1 + text.length;
        break;
      }
      case 'code': {
        if (selected.includes('\n')) {
          const lead = before.endsWith('\n') ? '' : '\n';
          const trail = after.startsWith('\n') ? '' : '\n';
          insert = `${lead}\`\`\`\n${selected || '// Viết code tại đây'}\n\`\`\`${trail}`;
          cursorOffset = lead.length + 4 + (selected.length || 20);
        } else {
          const text = selected || 'code';
          insert = ` \`${text}\` `;
          cursorOffset = insert.length - 1;
        }
        break;
      }
      case 'quote': {
        const lead = before.endsWith('\n') ? '' : (before.length === 0 ? '' : '\n\n');
        const text = selected || 'Trích dẫn quan trọng...';
        insert = `${lead}> ${text}\n\n`;
        cursorOffset = insert.length;
        break;
      }
      case 'link': {
        const url = prompt('Nhập đường dẫn liên kết (URL):', 'https://');
        if (!url) return;
        const title = selected || 'Xem liên kết';
        insert = ` [${title}](${url}) `;
        cursorOffset = insert.length;
        break;
      }
      case 'list': {
        const lead = before.endsWith('\n') ? '' : (before.length === 0 ? '' : '\n\n');
        const lines = selected ? selected.split('\n').map(l => `- ${l}`).join('\n') : '- Mục 1\n- Mục 2';
        insert = `${lead}${lines}\n\n`;
        cursorOffset = insert.length;
        break;
      }
      default:
        break;
    }

    const nextVal = before + insert + after;
    setContent(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 10);
  };

  // Đăng bình luận gốc
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await postApi.addComment(slug, content);
      const newComment = res?.data || res;
      setComments([newComment, ...comments]);
      setContent('');
      setActiveTab('write');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể đăng bình luận.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gửi trả lời bình luận (Reply like Facebook)
  const handleReplySubmit = async (parentId) => {
    if (!replyContent.trim() || isReplyingSubmitting) return;

    setIsReplyingSubmitting(true);
    try {
      const res = await postApi.addComment(slug, replyContent, parentId);
      const newReply = res?.data || res;

      // Cập nhật câu trả lời lồng vào bình luận cha
      setComments(comments.map(c => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), newReply]
          };
        }
        return c;
      }));

      setReplyingTo(null);
      setReplyContent('');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể gửi câu trả lời.');
    } finally {
      setIsReplyingSubmitting(false);
    }
  };

  const handleEditSubmit = async (commentId, isReply = false, parentId = null) => {
    if (!editContent.trim()) return;
    try {
      const res = await postApi.editComment(commentId, editContent);
      const updated = res?.data || res;

      if (isReply && parentId) {
        setComments(comments.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: (c.replies || []).map(r => r.id === commentId ? { ...r, content: updated.content, updated_at: updated.updated_at } : r)
            };
          }
          return c;
        }));
      } else {
        setComments(comments.map(c => c.id === commentId ? { ...c, content: updated.content, updated_at: updated.updated_at } : c));
      }

      setEditingId(null);
      setEditContent('');
    } catch (err) {
      alert('Không thể cập nhật bình luận.');
    }
  };

  const handleDeleteComment = async (commentId, isReply = false, parentId = null) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
      await postApi.deleteComment(commentId);
      if (isReply && parentId) {
        setComments(comments.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: (c.replies || []).filter(r => r.id !== commentId)
            };
          }
          return c;
        }));
      } else {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (err) {
      alert('Không thể xóa bình luận.');
    }
  };

  // Tính tổng số bình luận bao gồm cả reply
  const totalCommentsCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="pt-10 border-t border-zinc-200 dark:border-zinc-800 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Bình luận ({totalCommentsCount})</span>
        </h3>
      </div>

      {/* Editor */}
      {user ? (
        <form onSubmit={handlePostComment} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden space-y-0">
          {/* Editor Header: Tabs + Formatting Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 gap-2">
            <div className="flex items-center rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`px-3 py-1 rounded-lg transition ${activeTab === 'write' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'}`}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg transition ${activeTab === 'preview' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'}`}
              >
                Xem trước
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`hidden md:inline-block px-3 py-1 rounded-lg transition ${activeTab === 'split' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'}`}
              >
                Chia đôi
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 overflow-x-auto">
              <button
                type="button"
                onClick={() => applyFormat('bold')}
                className="p-1.5 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-lg text-xs hover:text-indigo-600 transition"
                title="In đậm"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('italic')}
                className="p-1.5 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-lg text-xs hover:text-indigo-600 transition"
                title="In nghiêng"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('code')}
                className="p-1.5 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-lg text-xs hover:text-indigo-600 transition"
                title="Mã nguồn (Code)"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('quote')}
                className="p-1.5 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-lg text-xs hover:text-indigo-600 transition"
                title="Trích dẫn"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('link')}
                className="p-1.5 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-lg text-xs hover:text-indigo-600 transition"
                title="Chèn liên kết"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-lg text-xs transition flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400"
                title="Tải ảnh lên Cloudinary"
              >
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <span className="text-[11px] hidden sm:inline">{isUploadingImage ? 'Đang tải...' : 'Tải ảnh'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => applyFormat('list')}
                className="p-1.5 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-lg text-xs hover:text-indigo-600 transition"
                title="Danh sách gạch đầu dòng"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-3">
            {activeTab === 'write' && (
              <textarea
                ref={textareaRef}
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Chia sẻ suy nghĩ của bạn với tư cách @${user.username}...`}
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none resize-y min-h-[90px] leading-relaxed p-1"
              />
            )}

            {activeTab === 'preview' && (
              <div className="p-4 min-h-[90px] rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 prose dark:prose-invert max-w-none text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">
                {content.trim() ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
                ) : (
                  <p className="text-zinc-400 italic">Chưa có nội dung để hiển thị xem trước...</p>
                )}
              </div>
            )}

            {activeTab === 'split' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <textarea
                  ref={textareaRef}
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Soạn thảo bên trái..."
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none resize-y min-h-[90px] leading-relaxed p-2 border border-zinc-200/60 dark:border-zinc-800 rounded-xl"
                />
                <div className="p-3 min-h-[90px] rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 prose dark:prose-invert max-w-none text-xs text-zinc-800 dark:text-zinc-200 overflow-y-auto max-h-[160px]">
                  {content.trim() ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
                  ) : (
                    <p className="text-zinc-400 italic">Live preview...</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-50/50 dark:bg-zinc-950/20 border-t border-zinc-100 dark:border-zinc-800/80">
            <span className="text-[11px] text-zinc-400">Ảnh tải lên tự động lưu trữ an toàn trên Cloudinary CDN.</span>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center bg-zinc-50 dark:bg-zinc-900/40">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Vui lòng đăng nhập để tham gia thảo luận cùng cộng đồng.</p>
          <Link
            to={`/login?redirect=/blog/${slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            Đăng nhập để bình luận
          </Link>
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-4 pt-2">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-zinc-400 animate-pulse">Đang tải bình luận...</div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!</div>
        ) : (
          comments.map((comment) => {
            const isAuthor = user && (user.id === comment.user_id || user.username === comment.author?.username);
            const isAdmin = user && user.role === 'admin';
            const canModify = isAuthor || isAdmin;
            const isReplyingThis = replyingTo?.commentId === comment.id;

            return (
              <div key={comment.id} className="space-y-3">
                {/* Bình luận gốc */}
                <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm space-y-2 transition hover:border-zinc-300 dark:hover:border-zinc-700">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-sm">
                        {comment.author?.username?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                            {comment.author?.username || 'Thành viên'}
                          </span>
                          {comment.author?.role === 'admin' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(comment.created_at).toLocaleString()}
                          {comment.updated_at && comment.updated_at !== comment.created_at && ' (đã chỉnh sửa)'}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Edit / Delete */}
                    {canModify && (
                      <div className="flex items-center gap-1">
                        {isAuthor && editingId !== comment.id && (
                          <button
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditContent(comment.content);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            title="Chỉnh sửa bình luận"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                          title="Xóa bình luận"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  {editingId === comment.id ? (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={2}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setEditingId(null); setEditContent(''); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleEditSubmit(comment.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pt-1 prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.content) }}
                    />
                  )}

                  {/* Footer Action: Reply Button (Like Facebook) */}
                  <div className="pt-2 flex items-center gap-4 text-xs font-semibold">
                    <button
                      onClick={() => {
                        if (!user) {
                          alert('Vui lòng đăng nhập để trả lời bình luận.');
                          return;
                        }
                        if (isReplyingThis) {
                          setReplyingTo(null);
                        } else {
                          setReplyingTo({ commentId: comment.id, username: comment.author?.username });
                          setReplyContent(`@${comment.author?.username} `);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>{isReplyingThis ? 'Hủy trả lời' : 'Trả lời'}</span>
                    </button>
                  </div>
                </div>

                {/* Khung nhập Trả lời (Reply Input Box) */}
                {isReplyingThis && (
                  <div className="ml-6 sm:ml-10 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-indigo-200 dark:border-indigo-950/60 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400">
                      <span className="flex items-center gap-1 font-medium">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        Đang trả lời @{replyingTo.username}
                      </span>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-zinc-400 hover:text-zinc-600 text-[11px]"
                      >
                        Đóng
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`Viết câu trả lời...`}
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-2.5 py-1 text-xs rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleReplySubmit(comment.id)}
                        disabled={!replyContent.trim() || isReplyingSubmitting}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isReplyingSubmitting ? 'Đang gửi...' : 'Trả lời'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Danh sách các câu trả lời lồng nhau (Nested Replies) */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-6 sm:ml-10 space-y-2 border-l-2 border-zinc-200 dark:border-zinc-800 pl-3 sm:pl-4">
                    {comment.replies.map((reply) => {
                      const isReplyAuthor = user && (user.id === reply.user_id || user.username === reply.author?.username);
                      const canModifyReply = isReplyAuthor || (user && user.role === 'admin');

                      return (
                        <div
                          key={reply.id}
                          className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center uppercase shadow-sm">
                                {reply.author?.username?.charAt(0) || 'U'}
                              </div>
                              <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                {reply.author?.username || 'Thành viên'}
                              </span>
                              {reply.author?.role === 'admin' && (
                                <span className="px-1 py-0.1 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                                  ADMIN
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400">
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
                            </div>

                            {canModifyReply && (
                              <div className="flex items-center gap-1">
                                {isReplyAuthor && editingId !== reply.id && (
                                  <button
                                    onClick={() => {
                                      setEditingId(reply.id);
                                      setEditContent(reply.content);
                                    }}
                                    className="p-1 text-zinc-400 hover:text-indigo-600 rounded"
                                    title="Sửa"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                                  className="p-1 text-zinc-400 hover:text-red-500 rounded"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {editingId === reply.id ? (
                            <div className="space-y-1.5 pt-1">
                              <textarea
                                rows={2}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100"
                              />
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => { setEditingId(null); setEditContent(''); }}
                                  className="px-2 py-0.5 text-xs text-zinc-500"
                                >
                                  Hủy
                                </button>
                                <button
                                  onClick={() => handleEditSubmit(reply.id, true, comment.id)}
                                  className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-600 text-white rounded"
                                >
                                  Lưu
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed prose dark:prose-invert max-w-none"
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(reply.content) }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
