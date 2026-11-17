import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  Clock,
  Upload,
  X,
  Check,
  ArrowRight,
  Search,
  AlertTriangle,
  Eye,
  GripVertical
} from 'lucide-react';
import { seriesService } from '../../../services/seriesService';
import { mediaService } from '../../../services/mediaService';
import { useApp } from '../../../contexts/AppContext';

export default function SeriesTab({ onSeriesUpdated }) {
  const { t, showToast } = useApp();
  const [seriesList, setSeriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  const [seriesForm, setSeriesForm] = useState({
    title: '',
    slug: '',
    description: '',
    cover_image: ''
  });

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    setIsLoading(true);
    try {
      const res = await seriesService.getSeriesList();
      const data = res?.data || res;
      setSeriesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load series list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleChange = (val) => {
    const updated = { ...seriesForm, title: val };
    // Auto-generate slug if not editing an existing slug manually
    if (!editingSeriesId) {
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      updated.slug = autoSlug;
    }
    setSeriesForm(updated);
  };

  const startEditSeries = (series) => {
    setEditingSeriesId(series.id);
    setSeriesForm({
      title: series.title || '',
      slug: series.slug || '',
      description: series.description || '',
      cover_image: series.cover_image || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSeriesId(null);
    setSeriesForm({
      title: '',
      slug: '',
      description: '',
      cover_image: ''
    });
  };

  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('apply_watermark', 'false');

    setIsUploading(true);
    try {
      const res = await mediaService.upload(formData);
      const data = res?.data || res;
      const uploadedUrl = data?.file?.watermarked_url || data?.file?.url || data?.url;
      if (uploadedUrl) {
        setSeriesForm((prev) => ({ ...prev, cover_image: uploadedUrl }));
        showToast('Tải ảnh bìa series thành công!');
      }
    } catch (err) {
      alert(err.message || 'Lỗi tải ảnh lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSeries = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingSeriesId) {
        await seriesService.updateSeries(editingSeriesId, seriesForm);
        showToast('Cập nhật series thành công!');
      } else {
        await seriesService.createSeries(seriesForm);
        showToast('Tạo series mới thành công!');
      }
      handleCancelEdit();
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.message || err.response?.data?.message || 'Lỗi khi lưu series');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSeries = async (id, title) => {
    const confirmName = window.prompt(
      `CẢNH BÁO: Bạn đang xóa Series "${title}".\nCác bài viết thuộc series này sẽ không bị xóa mà chỉ gỡ liên kết.\n\nNhập lại tên "${title}" để xác nhận xóa:`
    );
    if (confirmName !== title) {
      if (confirmName !== null) alert('Tên xác nhận không khớp. Hủy thao tác xóa.');
      return;
    }

    try {
      await seriesService.deleteSeries(id);
      showToast('Đã xóa Series thành công!');
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.message || 'Lỗi xóa series');
    }
  };

  const filteredSeries = seriesList.filter(
    (s) =>
      !searchFilter.trim() ||
      s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Series List (7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Danh Sách Chuỗi Bài Viết ({seriesList.length})
            </h2>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm theo tên series, slug..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>
            ))}
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <Layers className="w-10 h-10 mx-auto stroke-1" />
            <p className="text-sm font-medium">Chưa có Series nào phù hợp.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSeries.map((s) => {
              const isSelected = editingSeriesId === s.id;

              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/10 dark:bg-indigo-950/20 shadow-md'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {s.cover_image ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 group relative">
                        <img
                          src={s.cover_image}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                        <Layers className="w-8 h-8 stroke-1" />
                      </div>
                    )}

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Title on 2 lines max with tooltip */}
                      <h3
                        title={s.title}
                        className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base line-clamp-2 leading-snug"
                      >
                        {s.title}
                      </h3>

                      {/* Slug placed neatly on its own line below */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-xs">
                          /{s.slug}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {s.description || 'Chưa có mô tả chi tiết cho lộ trình này.'}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 pt-0.5 font-medium">
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                          <BookOpen className="w-3.5 h-3.5" />
                          {s.total_posts || 0} bài học
                        </span>
                        {s.total_videos > 0 && <span>• {s.total_videos} videos</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <a
                      href={`/series/${s.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                      title="Xem trang độc giả công khai"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => startEditSeries(s)}
                      className={`p-2 rounded-lg border transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                      title="Chỉnh sửa series này"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSeries(s.id, s.title)}
                      className="p-2 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition"
                      title="Xóa series (Yêu cầu nhập tên xác nhận)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Series Form (5 Cols Sticky) */}
      <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 lg:sticky lg:top-24 shadow-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {editingSeriesId ? 'Chỉnh Sửa Series' : 'Tạo Series Mới'}
            </h2>
            {editingSeriesId && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[240px]">
                Đang sửa: {seriesForm.title}
              </p>
            )}
          </div>
          {editingSeriesId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Hủy
            </button>
          )}
        </div>

        <form onSubmit={handleSaveSeries} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Tên Series (Lộ trình học) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={seriesForm.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="VD: Lộ trình Flask RESTful API từ A-Z"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 font-semibold focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Đường dẫn Slug (Tự sinh hoặc chỉnh sửa)
            </label>
            <input
              type="text"
              value={seriesForm.slug}
              onChange={(e) => setSeriesForm({ ...seriesForm, slug: e.target.value })}
              placeholder="lo-trinh-flask-restful-api"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent font-mono focus:border-indigo-500 outline-none"
            />
            {editingSeriesId && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Lưu ý: Đổi slug có thể làm hỏng các liên kết bài viết cũ.</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Mô tả lộ trình học tập
            </label>
            <textarea
              rows={3}
              value={seriesForm.description}
              onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
              placeholder="Mô tả nội dung các phần học, kỹ năng đạt được sau khi hoàn thành..."
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:border-indigo-500 outline-none leading-relaxed"
            />
          </div>

          {/* Series Cover Image with Upload / Replace / Delete */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Ảnh bìa Series (Tỉ lệ 16:9 gợi ý)
            </label>

            {seriesForm.cover_image ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 group">
                <img
                  src={seriesForm.cover_image}
                  alt="Series cover preview"
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-zinc-900 text-xs font-semibold cursor-pointer shadow transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Đổi ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCover}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setSeriesForm({ ...seriesForm, cover_image: '' })}
                    className="p-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700 shadow transition"
                    title="Xóa ảnh bìa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                <Upload className="w-6 h-6 text-zinc-400 group-hover:text-indigo-600 mb-1" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {isUploading ? 'Đang tải ảnh...' : 'Tải ảnh bìa Series lên từ máy'}
                </span>
                <span className="text-[11px] text-zinc-400">PNG, JPG, WEBP (Khuyên dùng 1200x675)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCover}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : editingSeriesId ? 'Cập nhật Series' : 'Tạo Series Mới'}
            </button>
            {editingSeriesId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Hủy bỏ
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
