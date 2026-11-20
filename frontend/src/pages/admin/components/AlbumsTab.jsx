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
  ZoomIn,
  Loader2
} from 'lucide-react';
import { mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

export default function AlbumsTab({ albums = [], onAlbumsUpdated }) {
  const { t, showToast } = useApp();

  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [selectedAlbumDetail, setSelectedAlbumDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for creating/editing album
  const initialForm = {
    title: '',
    slug: '',
    description: '',
    cover_image: ''
  };
  const [albumForm, setAlbumForm] = useState(initialForm);

  const [searchFilter, setSearchFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Photo upload states inside modal
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
        (a.description && a.description.toLowerCase().includes(q))
    );
  }, [albums, searchFilter]);

  // Load full album detail (including photos) when an album is selected
  const fetchAlbumDetail = async (album) => {
    setSelectedAlbumId(album.id);
    setLoadingDetail(true);
    setIsModalOpen(true);
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
    setAlbumForm(initialForm);
    setUploadQueue([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAlbumId(null);
    setSelectedAlbumDetail(null);
    setAlbumForm(initialForm);
    setUploadQueue([]);
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
        if (showToast) showToast('Tải ảnh bìa thành công!');
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
        if (showToast) showToast('Cập nhật album thành công!');
      } else {
        const res = await mediaApi.createAlbum(albumForm);
        const data = res?.data || res;
        setSelectedAlbumId(data.id);
        setSelectedAlbumDetail(data);
        if (showToast) showToast('Tạo album thành công! Bây giờ bạn có thể thêm ảnh.');
      }
      if (onAlbumsUpdated) onAlbumsUpdated();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Lỗi lưu album');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Entire Album
  const handleDeleteAlbum = async (id, title, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa album "${title}" và toàn bộ ảnh bên trong?`)) {
      return;
    }

    try {
      await mediaApi.deleteAlbum(id);
      if (selectedAlbumId === id) handleCloseModal();
      if (onAlbumsUpdated) onAlbumsUpdated();
      if (showToast) showToast('Đã xóa album!');
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

    // Reload album detail
    const res = await mediaApi.getAlbum(albumForm.slug);
    const data = res?.data || res;
    setSelectedAlbumDetail(data);
    if (onAlbumsUpdated) onAlbumsUpdated();
    if (showToast) showToast(`Đã tải lên thành công ${successCount} bức ảnh!`);
  };

  // Delete a photo from album
  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Xóa ảnh này khỏi album?')) return;
    try {
      await mediaApi.deletePhoto(photoId);
      setSelectedAlbumDetail((prev) => ({
        ...prev,
        photos: (prev.photos || []).filter((p) => p.id !== photoId)
      }));
      if (onAlbumsUpdated) onAlbumsUpdated();
      if (showToast) showToast('Đã xóa ảnh!');
    } catch (err) {
      alert('Lỗi xóa ảnh');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Quản Lý Album Nhiếp Ảnh</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
              {filteredAlbums.length}
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm album theo tên, slug..."
              className="text-xs pl-8 pr-7 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Album</span>
          </button>
        </div>
      </div>

      {/* Albums Full-Width List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredAlbums.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Camera className="w-10 h-10 mx-auto stroke-1 mb-2" />
            <p className="text-xs">Chưa có album nào phù hợp.</p>
          </div>
        ) : (
          filteredAlbums.map((alb) => (
            <div
              key={alb.id}
              onClick={() => fetchAlbumDetail(alb)}
              className="p-4 rounded-2xl transition-all duration-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Cover Thumbnail */}
                {alb.cover_image ? (
                  <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                    <img src={alb.cover_image} alt={alb.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                ) : (
                  <div className="w-20 h-14 rounded-xl shrink-0 border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400">
                    <ImageIcon className="w-6 h-6 stroke-1" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {alb.title}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                    /album/{alb.slug}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
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
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1"
                  title="Chỉnh sửa & quản lý ảnh"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  onClick={(e) => handleDeleteAlbum(alb.id, alb.title, e)}
                  className="p-2 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition"
                  title="Xóa album"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* POPUP MODAL TẠO & CHỈNH SỬA ALBUM + QUẢN LÝ ẢNH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedAlbumId ? 'Chỉnh Sửa Album & Quản Lý Ảnh' : 'Tạo Album Nhiếp Ảnh Mới'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedAlbumId ? `Đang quản lý Album: ${albumForm.title}` : 'Nhập thông tin cơ bản để khởi tạo album'}
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

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Thông tin Album */}
              <form onSubmit={handleSaveAlbum} className="space-y-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  1. Thông tin cơ bản
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Tiêu đề Album *
                    </label>
                    <input
                      type="text"
                      required
                      value={albumForm.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="VD: Hội thảo Công nghệ & Đời sống 2026"
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
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
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Mô tả Album
                  </label>
                  <textarea
                    rows={2}
                    value={albumForm.description}
                    onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                    placeholder="Mô tả sự kiện, địa điểm hoặc chủ đề của album..."
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Ảnh bìa */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Ảnh bìa đại diện
                  </label>
                  {albumForm.cover_image ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 h-32 flex items-center justify-center group">
                      <img src={albumForm.cover_image} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-zinc-900 text-xs font-semibold cursor-pointer shadow transition">
                          Đổi ảnh
                          <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={() => setAlbumForm({ ...albumForm, cover_image: '' })}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow transition"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-indigo-500 bg-white dark:bg-zinc-900 transition">
                      <Upload className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-500 font-semibold">Tải ảnh bìa lên</span>
                      <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{selectedAlbumId ? 'Lưu Thông Tin Album' : 'Tạo Album Bước 1'}</span>
                  </button>
                </div>
              </form>

              {/* 2. Quản lý Ảnh trong Album (chỉ hiển thị khi album đã tồn tại) */}
              {selectedAlbumId && (
                <div className="space-y-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      2. Thư viện ảnh trong Album ({(selectedAlbumDetail?.photos || []).length} ảnh)
                    </h4>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyWatermark}
                          onChange={(e) => setApplyWatermark(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Đóng dấu Watermark tự động</span>
                      </label>
                      <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm ảnh vào Album</span>
                        <input type="file" multiple accept="image/*" onChange={handleSelectPhotos} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Hàng đợi tải ảnh lên */}
                  {uploadQueue.length > 0 && (
                    <div className="p-3 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/50 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          Sẵn sàng tải lên: {uploadQueue.length} ảnh
                        </span>
                        <button
                          type="button"
                          onClick={handleStartUploadPhotos}
                          disabled={isUploadingPhotos}
                          className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {isUploadingPhotos ? `Đang tải ${uploadProgress.current}/${uploadProgress.total}...` : 'Bắt đầu tải lên'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {uploadQueue.map((item) => (
                          <div key={item.id} className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 p-1 space-y-1">
                            <img src={item.preview} alt="" className="w-full h-16 object-cover rounded" />
                            <input
                              type="text"
                              placeholder="Chú thích ảnh..."
                              value={item.caption}
                              onChange={(e) => updateQueueCaption(item.id, e.target.value)}
                              className="w-full text-[10px] p-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            />
                            <button
                              type="button"
                              onClick={() => removeQueueItem(item.id)}
                              className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Danh sách ảnh hiện có */}
                  {(selectedAlbumDetail?.photos || []).length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-4 text-center">Album chưa có ảnh nào.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-1">
                      {selectedAlbumDetail.photos.map((photo) => {
                        const pUrl = photo.photo_url || photo.url;
                        return (
                          <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
                            <img src={pUrl} alt={photo.caption || ''} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="self-end p-1 rounded-lg bg-red-600 text-white"
                                title="Xóa ảnh"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <div className="flex items-center justify-between text-white text-[10px]">
                                <span className="truncate pr-1">{photo.caption || 'Không chú thích'}</span>
                                <button type="button" onClick={() => setPreviewPhoto(photo)} className="p-1 hover:text-indigo-300">
                                  <ZoomIn className="w-3.5 h-3.5" />
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

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
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
