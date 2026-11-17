import React, { useState, useMemo } from 'react';
import {
  Camera,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Upload,
  X,
  Search,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Calendar,
  Layers,
  ZoomIn
} from 'lucide-react';
import { mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

export default function AlbumsTab({ albums, onAlbumsUpdated }) {
  const { t, showToast } = useApp();

  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [selectedAlbumDetail, setSelectedAlbumDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state for creating/editing album
  const [albumForm, setAlbumForm] = useState({
    title: '',
    slug: '',
    description: '',
    cover_image: ''
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Photo upload states
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Lightbox preview for photos inside album
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Filtered albums list
  const filteredAlbums = useMemo(() => {
    if (!searchFilter.trim()) return albums;
    const q = searchFilter.toLowerCase();
    return albums.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.slug?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
    );
  }, [albums, searchFilter]);

  // Load full album detail (including photos) when an album is selected
  const fetchAlbumDetail = async (album) => {
    setSelectedAlbumId(album.id);
    setLoadingDetail(true);
    try {
      const res = await mediaApi.getAlbum(album.slug);
      const data = res?.data || res;
      setSelectedAlbumDetail(data);
      setAlbumForm({
        title: data.title || '',
        slug: data.slug || '',
        description: data.description || '',
        cover_image: data.cover_image || ''
      });
    } catch (err) {
      console.error(err);
      // Fallback
      setSelectedAlbumDetail(album);
      setAlbumForm({
        title: album.title || '',
        slug: album.slug || '',
        description: album.description || '',
        cover_image: album.cover_image || ''
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedAlbumId(null);
    setSelectedAlbumDetail(null);
    setAlbumForm({
      title: '',
      slug: '',
      description: '',
      cover_image: ''
    });
  };

  const generateSlugFromTitle = (title) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleTitleChange = (val) => {
    setAlbumForm((prev) => ({
      ...prev,
      title: val,
      // Auto-generate slug when creating new album
      slug: selectedAlbumId ? prev.slug : generateSlugFromTitle(val)
    }));
  };

  // Upload Cover Image
  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('apply_watermark', 'false');

    setIsUploadingCover(true);
    try {
      const res = await mediaApi.upload(formData);
      const data = res?.data || res;
      const uploadedUrl = data?.file?.watermarked_url || data?.file?.url || data?.url;
      if (uploadedUrl) {
        setAlbumForm((prev) => ({ ...prev, cover_image: uploadedUrl }));
        showToast('Tải ảnh bìa thành công!');
      }
    } catch (err) {
      alert(err.message || 'Lỗi tải ảnh bìa');
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Save Album (Create or Update)
  const handleSaveAlbum = async (e) => {
    e.preventDefault();
    if (!albumForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề album!');
      return;
    }

    setIsSaving(true);
    try {
      if (selectedAlbumId) {
        await mediaApi.updateAlbum(selectedAlbumId, albumForm);
        showToast('Cập nhật album thành công!');
      } else {
        const res = await mediaApi.createAlbum(albumForm);
        const newAlbum = res?.data || res;
        showToast('Tạo album mới thành công!');
        if (newAlbum?.id) {
          fetchAlbumDetail(newAlbum);
        }
      }
      if (onAlbumsUpdated) onAlbumsUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi lưu album');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Album with safe prompt
  const handleDeleteAlbum = async (id, title) => {
    const confirmName = window.prompt(
      `CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn Album "${title}" và toàn bộ ảnh bên trong!\n\nNhập đúng tên album để xác nhận xóa:`
    );
    if (confirmName !== title) {
      if (confirmName !== null) alert('Tên không khớp. Hủy thao tác xóa.');
      return;
    }

    try {
      await mediaApi.deleteAlbum(id);
      showToast('Đã xóa album thành công!');
      handleCreateNew();
      if (onAlbumsUpdated) onAlbumsUpdated();
    } catch (err) {
      alert('Lỗi xóa album');
    }
  };

  // Handle selection of multiple photos to upload into album
  const handleSelectPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      caption: '',
      preview: URL.createObjectURL(file)
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeQueueItem = (id) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQueueCaption = (id, caption) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption } : item))
    );
  };

  // Upload queued photos to current album
  const handleStartUploadPhotos = async () => {
    if (!selectedAlbumId) {
      alert('Vui lòng lưu Album trước khi tải ảnh vào!');
      return;
    }
    if (!uploadQueue.length) return;

    setIsUploadingPhotos(true);
    setUploadProgress({ current: 0, total: uploadQueue.length });

    let successCount = 0;
    for (let i = 0; i < uploadQueue.length; i++) {
      const item = uploadQueue[i];
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('caption', item.caption || '');
      formData.append('apply_watermark', applyWatermark ? 'true' : 'false');

      try {
        await mediaApi.addPhotoToAlbum(selectedAlbumId, formData);
        successCount++;
        setUploadProgress({ current: i + 1, total: uploadQueue.length });
      } catch (err) {
        console.error('Failed to upload photo:', item.file.name, err);
      }
    }

    setIsUploadingPhotos(false);
    setUploadQueue([]);
    showToast(`Đã tải lên thành công ${successCount}/${uploadQueue.length} bức ảnh!`);

    // Reload album detail to reflect new photos
    if (selectedAlbumDetail) {
      fetchAlbumDetail(selectedAlbumDetail);
    }
    if (onAlbumsUpdated) onAlbumsUpdated();
  };

  // Delete individual photo from album
  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bức ảnh này khỏi album?')) return;
    try {
      await mediaApi.deletePhoto(photoId);
      showToast('Đã xóa ảnh thành công!');
      if (selectedAlbumDetail) {
        fetchAlbumDetail(selectedAlbumDetail);
      }
      if (onAlbumsUpdated) onAlbumsUpdated();
    } catch (err) {
      alert('Lỗi xóa ảnh');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* CỘT TRÁI: DANH SÁCH ALBUMS (7 COLS) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Quản Lý Album ({albums.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Tìm album theo tên, slug..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Album</span>
            </button>
          </div>
        </div>

        {/* Albums List */}
        {filteredAlbums.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
            <Camera className="w-10 h-10 mx-auto text-zinc-400 stroke-1" />
            <p className="text-sm font-medium text-zinc-500">Chưa có album nào.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlbums.map((alb) => {
              const isSelected = selectedAlbumId === alb.id;
              return (
                <div
                  key={alb.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/10 dark:bg-indigo-950/20 shadow-md'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Cover Thumbnail */}
                    {alb.cover_image ? (
                      <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                        <img
                          src={alb.cover_image}
                          alt={alb.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-14 rounded-xl shrink-0 border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400">
                        <ImageIcon className="w-6 h-6 stroke-1" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3
                        onClick={() => fetchAlbumDetail(alb)}
                        className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      >
                        {alb.title}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                        /album/{alb.slug}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" />
                          {alb.photo_count || alb.photos?.length || 0} ảnh
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {alb.created_at ? new Date(alb.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <a
                      href={`/album/${alb.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                      title="Xem trang album công khai"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => fetchAlbumDetail(alb)}
                      className={`p-2 rounded-lg border transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                      title="Chỉnh sửa & quản lý ảnh"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAlbum(alb.id, alb.title)}
                      className="p-2 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition"
                      title="Xóa album"
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

      {/* CỘT PHẢI: FORM ALBUM & TRÌNH QUẢN LÝ ẢNH (5 COLS STICKY) */}
      <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 lg:sticky lg:top-24 shadow-sm max-h-[calc(100vh-8rem)] overflow-y-auto space-y-6">
        {/* Form Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {selectedAlbumId ? 'Chỉnh Sửa Album' : 'Tạo Album Mới'}
            </h2>
            {selectedAlbumId && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[240px]">
                Đang quản lý: {albumForm.title}
              </p>
            )}
          </div>
          {selectedAlbumId && (
            <button
              onClick={handleCreateNew}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium"
            >
              Hủy chọn
            </button>
          )}
        </div>

        {/* 1. Thông tin cơ bản Album */}
        <form onSubmit={handleSaveAlbum} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Tiêu đề Album *
            </label>
            <input
              type="text"
              required
              value={albumForm.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="VD: Khoảnh khắc Hội thảo Công nghệ & Đời sống 2026"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Đường dẫn Slug (URL)
            </label>
            <input
              type="text"
              required
              value={albumForm.slug}
              onChange={(e) => setAlbumForm({ ...albumForm, slug: e.target.value })}
              placeholder="khoanh-khac-hoi-thao-2026"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Mô tả Album
            </label>
            <textarea
              rows={2}
              value={albumForm.description}
              onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
              placeholder="Mô tả nội dung, địa điểm hoặc sự kiện ghi lại..."
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Ảnh bìa Album */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Ảnh bìa Album (Cover Image)
            </label>
            {albumForm.cover_image ? (
              <div className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={albumForm.cover_image}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-zinc-900 text-xs font-semibold transition">
                    Đổi ảnh
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCover}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setAlbumForm({ ...albumForm, cover_image: '' })}
                    className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white transition"
                    title="Xóa ảnh bìa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition">
                <Upload className="w-5 h-5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {isUploadingCover ? 'Đang tải lên...' : 'Chọn hoặc kéo thả ảnh bìa'}
                </span>
                <span className="text-[10px] text-zinc-400">Tỷ lệ khuyến nghị 16:9</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCover}
                  className="hidden"
                  disabled={isUploadingCover}
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {isSaving ? 'Đang lưu...' : selectedAlbumId ? 'Cập Nhật Album' : 'Tạo Album Mới'}
          </button>
        </form>

        {/* 2. KHU VỰC QUẢN LÝ ẢNH TRONG ALBUM (Khi đã chọn Album) */}
        {selectedAlbumId && (
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Ảnh trong Album ({selectedAlbumDetail?.photos?.length || 0})
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Tải thêm ảnh hoặc xóa ảnh hiện có
                </p>
              </div>

              {/* Watermark checkbox toggle */}
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={applyWatermark}
                  onChange={(e) => setApplyWatermark(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Đóng dấu Watermark</span>
              </label>
            </div>

            {/* Dropzone chọn nhiều ảnh */}
            <div>
              <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/40 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-indigo-50/20 dark:bg-indigo-950/10 transition">
                <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  + Chọn nhiều ảnh để thêm vào Album
                </span>
                <span className="text-[10px] text-zinc-400">Hỗ trợ JPG, PNG, WEBP</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleSelectPhotos}
                  className="hidden"
                  disabled={isUploadingPhotos}
                />
              </label>
            </div>

            {/* Hàng đợi ảnh chuẩn bị tải lên */}
            {uploadQueue.length > 0 && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Hàng đợi ({uploadQueue.length} ảnh đã chọn):</span>
                  <button
                    onClick={() => setUploadQueue([])}
                    className="text-red-500 hover:underline text-[11px]"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {uploadQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                    >
                      <img
                        src={item.preview}
                        alt="Queue preview"
                        className="w-10 h-10 object-cover rounded shrink-0"
                      />
                      <input
                        type="text"
                        value={item.caption}
                        onChange={(e) => updateQueueCaption(item.id, e.target.value)}
                        placeholder="Chú thích ảnh (tùy chọn)..."
                        className="text-[11px] p-1.5 flex-1 rounded border border-zinc-200 dark:border-zinc-800 bg-transparent"
                      />
                      <button
                        onClick={() => removeQueueItem(item.id)}
                        className="p-1 text-zinc-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleStartUploadPhotos}
                  disabled={isUploadingPhotos}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingPhotos
                      ? `Đang tải ${uploadProgress.current}/${uploadProgress.total}...`
                      : `Bắt đầu tải ${uploadQueue.length} ảnh lên`}
                  </span>
                </button>
              </div>
            )}

            {/* Lưới ảnh hiện có trong Album */}
            {loadingDetail ? (
              <div className="p-8 text-center text-xs text-zinc-400">Đang tải ảnh...</div>
            ) : selectedAlbumDetail?.photos?.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs">
                Album này chưa có ảnh nào. Hãy chọn ảnh ở trên để tải lên!
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {selectedAlbumDetail?.photos?.map((photo) => {
                  const pUrl = photo.photo_url || photo.url;
                  return (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800"
                    >
                      <img
                        src={pUrl}
                        alt={photo.caption || ''}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-1.5">
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="self-end p-1 rounded bg-red-600/90 hover:bg-red-600 text-white"
                          title="Xóa ảnh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center justify-between text-white text-[10px]">
                          <span className="truncate pr-1">{photo.caption || 'Không chú thích'}</span>
                          <button
                            onClick={() => setPreviewPhoto(photo)}
                            className="p-1 hover:text-indigo-300"
                            title="Xem lớn"
                          >
                            <ZoomIn className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Xem trước ảnh lớn */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-3xl max-h-[85vh] flex flex-col items-center">
            <img
              src={previewPhoto.photo_url || previewPhoto.url}
              alt={previewPhoto.caption || ''}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            {previewPhoto.caption && (
              <p className="mt-3 text-center text-xs text-zinc-300">
                {previewPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
