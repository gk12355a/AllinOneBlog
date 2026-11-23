import React, { useState } from 'react';
import { 
  Play, Plus, Edit2, Trash2, ExternalLink, Search, 
  Layers, Clock, Eye, AlertCircle, CheckCircle2, Video as VideoIcon, X, Loader2, Upload
} from 'lucide-react';
import { YoutubeIcon } from '../../../components/SocialIcons';
import contentService from '../../../services/contentService';
import { mediaService } from '../../../services/mediaService';
import { useApp } from '../../../contexts/AppContext';
import PaginationControl from './PaginationControl';

export default function VideosTab({ videos = [], seriesList = [], posts = [], onRefresh }) {
  const { lang, t } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Phân trang & Tùy chọn số lượng dòng (pageSize)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      updates.thumbnail_url = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleUploadThumbnail = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingThumb(true);
    try {
      const res = await mediaService.uploadMedia(file, 'videos');
      const url = res.data?.url || res.url;
      if (url) {
        setForm((prev) => ({ ...prev, thumbnail_url: url }));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setIsUploadingThumb(false);
      e.target.value = '';
    }
  };

  const handleOpenCreateModal = () => {
    setEditingVideo(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v) => {
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
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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

      handleCloseModal();
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
      alert(err.message || 'Error deleting video');
    }
  };

  // Chapter management helpers
  const handleAddChapter = () => {
    setForm((prev) => ({
      ...prev,
      chapters: [...prev.chapters, { time: '00:00', title: '' }]
    }));
  };

  const handleUpdateChapter = (idx, field, val) => {
    setForm((prev) => {
      const next = [...prev.chapters];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, chapters: next };
    });
  };

  const handleRemoveChapter = (idx) => {
    setForm((prev) => ({
      ...prev,
      chapters: prev.chapters.filter((_, i) => i !== idx)
    }));
  };

  // Lọc danh sách
  const filteredVideos = (videos || []).filter((v) => {
    const matchSearch =
      v.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.slug && v.slug.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Reset trang 1 khi lọc hoặc đổi pageSize
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  // Dữ liệu phân trang
  const paginatedVideos = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVideos.slice(start, start + pageSize);
  }, [filteredVideos, currentPage, pageSize]);

  const ytId = extractYouTubeId(form.video_url);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{lang === 'vi' ? 'Quản Lý Video Showcase' : 'Manage Video Showcase'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
              {filteredVideos.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Nhấp trực tiếp vào video để mở popup xem thông tin và chỉnh sửa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'vi' ? 'Tìm video theo tiêu đề, slug...' : 'Search videos...'}
              className="w-48 sm:w-60 pl-8 pr-7 py-1.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
          >
            <option value="all">{lang === 'vi' ? 'Tất cả trạng thái' : 'All status'}</option>
            <option value="published">{lang === 'vi' ? 'Đã công khai' : 'Published'}</option>
            <option value="draft">{lang === 'vi' ? 'Bản nháp' : 'Draft'}</option>
          </select>

          {/* Create Button */}
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Video mới</span>
          </button>
        </div>
      </div>

      {/* Videos Full-Width List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredVideos.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <VideoIcon className="w-10 h-10 mx-auto stroke-1 mb-2" />
            <p className="text-xs">{lang === 'vi' ? 'Không tìm thấy video nào.' : 'No videos found.'}</p>
          </div>
        ) : (
          paginatedVideos.map((v) => {
            const sInfo = seriesList.find((s) => s.id === v.series_id);
            return (
              <div
                key={v.id}
                onClick={() => handleOpenEditModal(v)}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Thumbnail with duration */}
                  <div className="relative w-24 h-14 rounded-xl overflow-hidden bg-zinc-950 flex-shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-inner">
                    <img
                      src={v.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80'}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    {v.duration && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-black/80 text-white backdrop-blur-xs">
                        {v.duration}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          v.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                        }`}
                      >
                        {v.status === 'published' ? (lang === 'vi' ? 'Công khai' : 'Published') : (lang === 'vi' ? 'Nháp' : 'Draft')}
                      </span>

                      {sInfo && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/40 truncate max-w-[160px]">
                          <Layers className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{sInfo.title}</span>
                        </span>
                      )}

                      <span className="text-[10px] text-zinc-400 font-medium">{v.category || 'Lập trình'}</span>
                    </div>

                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" title={v.title}>
                      {v.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {v.view_count || 0} lượt xem
                      </span>
                      <span>•</span>
                      <span className="font-mono truncate max-w-[160px]">/{v.slug || v.id}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
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
                    onClick={() => handleOpenEditModal(v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
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

        {/* Thanh Điều Hướng Phân Trang */}
        <PaginationControl
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredVideos.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="video"
          itemLabelEn="videos"
        />
      </div>

      {/* POPUP MODAL TẠO / SỬA VIDEO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <VideoIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {editingVideo ? (lang === 'vi' ? 'Chỉnh Sửa Video Showcase' : 'Edit Video') : (lang === 'vi' ? 'Thêm Video Mới' : 'Add New Video')}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {editingVideo ? `Đang chỉnh sửa Video ID #${editingVideo.id}` : 'Điền đường link video YouTube / Vimeo và thông tin'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Video URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Đường link Video (YouTube / Vimeo) *
                </label>
                <input
                  type="url"
                  required
                  value={form.video_url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Tiêu đề Video *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Hướng dẫn Clean Architecture với Flask..."
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Đường dẫn Slug (URL)
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="tu-dong-sinh-neu-bo-trong"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Thumbnail URL & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      Ảnh thu nhỏ (Thumbnail URL)
                    </label>
                    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer transition">
                      {isUploadingThumb ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>Tải ảnh từ máy tính</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingThumb}
                        onChange={handleUploadThumbnail}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={form.thumbnail_url}
                      onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                      placeholder="https://... hoặc bấm nút tải ảnh bên trên"
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {form.thumbnail_url && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
                        <img src={form.thumbnail_url} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Thời lượng (VD: 15:30)
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="12:45"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-center text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Status, Category & Series */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="published">Công khai (Published)</option>
                    <option value="draft">Bản nháp (Draft)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Chuyên mục</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Lập trình, DevOps..."
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Gán vào Series</label>
                  <select
                    value={form.series_id || ''}
                    onChange={(e) => setForm({ ...form, series_id: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="">-- Không gán Series --</option>
                    {seriesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Mô tả video</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả nội dung, công nghệ sử dụng trong video..."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Chapters / Dấu mốc thời gian */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Các mốc thời gian (Chapters)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    + Thêm mốc
                  </button>
                </div>
                {form.chapters.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic">Chưa có mốc thời gian nào được tạo.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {form.chapters.map((ch, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ch.time}
                          onChange={(e) => handleUpdateChapter(idx, 'time', e.target.value)}
                          placeholder="01:30"
                          className="w-20 text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-center"
                        />
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) => handleUpdateChapter(idx, 'title', e.target.value)}
                          placeholder="Tiêu đề đoạn (vd: Giới thiệu architecture)..."
                          className="flex-1 text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveChapter(idx)}
                          className="p-1.5 text-zinc-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingVideo ? 'Cập Nhật Video' : 'Lưu Video Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Xác nhận xóa Video?</h4>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Hành động này sẽ xóa video khỏi hệ thống vĩnh viễn và không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
