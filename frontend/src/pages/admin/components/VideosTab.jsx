import React, { useState } from 'react';
import { 
  Play, Plus, Edit2, Trash2, ExternalLink, Search, 
  Layers, Clock, Eye, AlertCircle, CheckCircle2, Video as VideoIcon
} from 'lucide-react';
import { YoutubeIcon } from '../../../components/SocialIcons';
import contentService from '../../../services/contentService';
import { useApp } from '../../../contexts/AppContext';

export default function VideosTab({ videos, seriesList = [], posts = [], onRefresh }) {
  const { lang, t } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingVideo, setEditingVideo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const initialForm = {
    title: '',
    slug: '',
    video_url: '',
    thumbnail_url: '',
    duration: '',
    description: '',
    platform: 'youtube',
    category: 'Lập trình',
    status: 'published',
    language: 'vi',
    series_id: '',
    order_index: 0,
    related_post_id: '',
    chapters: []
  };

  const [form, setForm] = useState(initialForm);

  // Helper trích xuất ID YouTube
  const extractYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  // Tự động điền thumbnail khi nhập URL YouTube
  const handleUrlChange = (url) => {
    const ytId = extractYouTubeId(url);
    const updates = { video_url: url };
    if (ytId && !form.thumbnail_url) {
      updates.thumbnail_url = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
    }
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleEditClick = (v) => {
    setEditingVideo(v);
    setForm({
      title: v.title || '',
      slug: v.slug || '',
      video_url: v.video_url || '',
      thumbnail_url: v.thumbnail_url || '',
      duration: v.duration || '',
      description: v.description || '',
      platform: v.platform || 'youtube',
      category: v.category || 'Lập trình',
      status: v.status || 'published',
      language: v.language || 'vi',
      series_id: v.series_id || '',
      order_index: v.order_index || 0,
      related_post_id: v.related_post_id || '',
      chapters: Array.isArray(v.chapters) ? v.chapters : []
    });
  };

  const handleCancel = () => {
    setEditingVideo(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.video_url.trim()) {
      alert(lang === 'vi' ? 'Vui lòng nhập tiêu đề và đường link video.' : 'Please provide title and video URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        series_id: form.series_id ? parseInt(form.series_id) : null,
        related_post_id: form.related_post_id ? parseInt(form.related_post_id) : null,
        order_index: parseInt(form.order_index || 0)
      };

      if (editingVideo) {
        await contentService.updateVideo(editingVideo.id, payload);
      } else {
        await contentService.createVideo(payload);
      }

      handleCancel();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      alert(err.message || (lang === 'vi' ? 'Thao tác thất bại.' : 'Action failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await contentService.deleteVideo(id);
      setDeleteConfirmId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error deleting video');
    }
  };

  // Chapter management helpers
  const handleAddChapter = () => {
    setForm(prev => ({
      ...prev,
      chapters: [...prev.chapters, { time: '00:00', title: '' }]
    }));
  };

  const handleUpdateChapter = (idx, field, val) => {
    setForm(prev => {
      const next = [...prev.chapters];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, chapters: next };
    });
  };

  const handleRemoveChapter = (idx) => {
    setForm(prev => ({
      ...prev,
      chapters: prev.chapters.filter((_, i) => i !== idx)
    }));
  };

  // Lọc danh sách
  const filteredVideos = (videos || []).filter(v => {
    const matchSearch = v.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        v.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const ytId = extractYouTubeId(form.video_url);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{lang === 'vi' ? 'Quản Lý Video Showcase' : 'Manage Video Showcase'}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {lang === 'vi' 
              ? 'Tổ chức các video hướng dẫn, demo tính năng, gắn kết với Series bài học và bài viết liên quan.' 
              : 'Organize tutorial videos, demo showcases, and link them with series & blog articles.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Danh sách Video (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Controls: Search & Filter */}
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'vi' ? 'Tìm video theo tiêu đề, mô tả...' : 'Search videos...'}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{lang === 'vi' ? 'Tất cả trạng thái' : 'All status'}</option>
              <option value="published">{lang === 'vi' ? 'Đã công khai' : 'Published'}</option>
              <option value="draft">{lang === 'vi' ? 'Bản nháp' : 'Draft'}</option>
            </select>
          </div>

          {/* Videos List / Table */}
          <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredVideos.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <VideoIcon className="w-10 h-10 mx-auto stroke-1 mb-2" />
                <p className="text-xs">{lang === 'vi' ? 'Không tìm thấy video nào.' : 'No videos found.'}</p>
              </div>
            ) : (
              filteredVideos.map((v) => {
                const sInfo = seriesList.find(s => s.id === v.series_id);
                return (
                  <div key={v.id} className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Thumbnail with duration badge */}
                      <div className="relative w-24 h-14 rounded-xl overflow-hidden bg-zinc-950 flex-shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-inner">
                        <img 
                          src={v.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80'} 
                          alt={v.title} 
                          className="w-full h-full object-cover"
                        />
                        {v.duration && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-black/80 text-white backdrop-blur-xs">
                            {v.duration}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            v.status === 'published' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }`}>
                            {v.status === 'published' ? (lang === 'vi' ? 'Công khai' : 'Published') : (lang === 'vi' ? 'Nháp' : 'Draft')}
                          </span>
                          {sInfo && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/40 truncate max-w-[160px]">
                              <Layers className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{sInfo.title}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={v.title}>
                          {v.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {v.view_count || 0}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{v.category || 'Tech'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={`/videos/${v.slug || v.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="Xem trang công khai"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleEditClick(v)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(v.id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="Xóa video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Form Thêm / Sửa Video (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm sticky top-6">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-5 flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {editingVideo 
                ? (lang === 'vi' ? 'Chỉnh Sửa Video' : 'Edit Video') 
                : (lang === 'vi' ? 'Thêm Video Mới' : 'Add New Video')}
            </h3>
            {editingVideo && (
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {lang === 'vi' ? 'Hủy sửa' : 'Cancel'}
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Video URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                {lang === 'vi' ? 'Đường link Video (YouTube / Vimeo)' : 'Video URL'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <YoutubeIcon className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  required
                  value={form.video_url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Video Live Preview Player */}
            {ytId && (
              <div className="rounded-xl overflow-hidden aspect-video bg-black border border-zinc-200 dark:border-zinc-800 shadow-inner">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                  title="Live Preview"
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                {lang === 'vi' ? 'Tiêu đề Video' : 'Title'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder={lang === 'vi' ? 'Hướng dẫn lập trình...' : 'Tutorial title...'}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Slug & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))}
                  placeholder="tu-dong-sinh"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Thời lượng (mm:ss)' : 'Duration'}
                </label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => setForm(p => ({ ...p, duration: e.target.value }))}
                  placeholder="12:45"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Thumbnail URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                {lang === 'vi' ? 'Ảnh đại diện (Thumbnail URL)' : 'Thumbnail URL'}
              </label>
              <input
                type="url"
                value={form.thumbnail_url}
                onChange={(e) => setForm(p => ({ ...p, thumbnail_url: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Series & Position */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Thuộc Series' : 'Assign to Series'}
                </label>
                <select
                  value={form.series_id}
                  onChange={(e) => setForm(p => ({ ...p, series_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{lang === 'vi' ? '-- Không thuộc series --' : '-- Standalone --'}</option>
                  {seriesList.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Thứ tự trong Series' : 'Order Index'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.order_index}
                  onChange={(e) => setForm(p => ({ ...p, order_index: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Related Blog Post */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                {lang === 'vi' ? 'Bài viết đi kèm (Related Blog Post)' : 'Related Blog Post'}
              </label>
              <select
                value={form.related_post_id}
                onChange={(e) => setForm(p => ({ ...p, related_post_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{lang === 'vi' ? '-- Không liên kết bài viết --' : '-- None --'}</option>
                {posts.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Status & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Trạng thái' : 'Status'}
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="published">{lang === 'vi' ? 'Công khai' : 'Published'}</option>
                  <option value="draft">{lang === 'vi' ? 'Bản nháp' : 'Draft'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Chủ đề / Chuyên mục' : 'Category'}
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                  placeholder="Frontend / Backend..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                {lang === 'vi' ? 'Mô tả ngắn gọn' : 'Description'}
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder={lang === 'vi' ? 'Nội dung video bao gồm các bước...' : 'Video description...'}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Chapters / Timeline */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {lang === 'vi' ? 'Mốc thời gian (Chapters)' : 'Chapters'}
                </span>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'vi' ? 'Thêm mốc' : 'Add'}</span>
                </button>
              </div>

              {form.chapters.length > 0 && (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {form.chapters.map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ch.time}
                        onChange={(e) => handleUpdateChapter(idx, 'time', e.target.value)}
                        placeholder="02:15"
                        className="w-16 px-2 py-1 rounded-lg text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                      <input
                        type="text"
                        value={ch.title}
                        onChange={(e) => handleUpdateChapter(idx, 'title', e.target.value)}
                        placeholder="Tiêu đề đoạn..."
                        className="flex-1 px-2.5 py-1 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveChapter(idx)}
                        className="p-1 text-zinc-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {editingVideo ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>
                  {isSubmitting 
                    ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') 
                    : editingVideo 
                      ? (lang === 'vi' ? 'Cập Nhật Video' : 'Update Video') 
                      : (lang === 'vi' ? 'Thêm Video Mới' : 'Publish Video')}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {lang === 'vi' ? 'Xác nhận xóa Video?' : 'Confirm Delete Video?'}
              </h4>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {lang === 'vi' 
                ? 'Hành động này sẽ xóa video khỏi hệ thống vĩnh viễn và không thể hoàn tác.' 
                : 'This action cannot be undone. The video will be removed permanently.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
              >
                {lang === 'vi' ? 'Xóa vĩnh viễn' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
