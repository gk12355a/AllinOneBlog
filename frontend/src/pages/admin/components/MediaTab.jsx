import React, { useState, useMemo } from 'react';
import { Upload, Trash2, Search, X, Eye, Image as ImageIcon, Copy, Check, ExternalLink } from 'lucide-react';
import { mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';
import PaginationControl from './PaginationControl';

export default function MediaTab({ mediaList = [], onMediaUpdated }) {
  const { t } = useApp();
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewMedia, setPreviewMedia] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);

  // Phân trang & Tùy chọn số lượng dòng (pageSize)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleUploadMedia = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await mediaApi.upload(formData);
      if (res?.success || res?.data?.success) {
        setUploadFile(null);
        if (onMediaUpdated) onMediaUpdated();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa tệp tin này không?')) return;
    try {
      await mediaApi.deleteMedia(id);
      if (previewMedia?.id === id) setPreviewMedia(null);
      if (onMediaUpdated) onMediaUpdated();
    } catch (err) {
      alert('Error deleting media');
    }
  };

  const handleCopyUrl = (url, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Filtered Media List
  const filteredMedia = useMemo(() => {
    if (!searchTerm.trim()) return mediaList;
    const q = searchTerm.toLowerCase();
    return mediaList.filter((m) => m.filename?.toLowerCase().includes(q));
  }, [mediaList, searchTerm]);

  // Reset trang 1 khi lọc hoặc đổi pageSize
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  // Dữ liệu phân trang
  const paginatedMedia = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMedia.slice(start, start + pageSize);
  }, [filteredMedia, currentPage, pageSize]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload Box & Search Controls */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{t('admin.upload_title') || 'Quản Lý Hình Ảnh & Watermark'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                {filteredMedia.length}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tải ảnh lên thư viện, đóng dấu bản quyền tự động và nhấp vào ảnh để xem chi tiết.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên file ảnh..."
              className="text-xs pl-8 pr-7 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 sm:w-64"
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
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUploadMedia} className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setUploadFile(e.target.files[0])}
            className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:bg-zinc-200 cursor-pointer w-full sm:w-auto"
          />
          <button
            type="submit"
            disabled={!uploadFile || uploading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? t('admin.uploading') || 'Đang tải...' : t('admin.upload_btn') || 'Tải ảnh lên'}
          </button>
        </form>
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/40 text-zinc-400">
          <ImageIcon className="w-10 h-10 mx-auto stroke-1 mb-2" />
          <p className="text-xs font-medium">Không tìm thấy hình ảnh nào phù hợp.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paginatedMedia.map((m) => {
              const displayUrl = m.watermark_url || m.file_url || m.url;
              return (
                <div
                  key={m.id}
                  onClick={() => setPreviewMedia(m)}
                  className="group relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md hover:border-indigo-500/50 cursor-pointer transition flex flex-col"
                >
                  <div className="relative w-full h-36 bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
                    <img
                      src={displayUrl}
                      alt={m.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleCopyUrl(displayUrl, e)}
                        title="Copy URL ảnh"
                        className="p-1.5 rounded-lg bg-white/90 text-zinc-800 hover:bg-white shadow transition"
                      >
                        {copiedUrl === displayUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMedia(m.id, e)}
                        className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow transition"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200" title={m.filename}>
                      {m.filename}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                      <span>{m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : 'Ảnh'}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">Bấm xem</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thanh Điều Hướng Phân Trang */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <PaginationControl
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredMedia.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="hình ảnh"
              itemLabelEn="images"
            />
          </div>
        </div>
      )}

      {/* POPUP MODAL PREVIEW MEDIA */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="min-w-0 flex-1 pr-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {previewMedia.filename}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Kích thước: {previewMedia.file_size ? `${(previewMedia.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="max-h-[50vh] flex items-center justify-center bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 p-2">
                <img
                  src={previewMedia.watermark_url || previewMedia.file_url || previewMedia.url}
                  alt={previewMedia.filename}
                  className="max-h-[46vh] w-auto object-contain rounded-xl"
                />
              </div>

              {/* URL field with copy */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Đường dẫn tệp (URL):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={previewMedia.watermark_url || previewMedia.file_url || previewMedia.url}
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleCopyUrl(previewMedia.watermark_url || previewMedia.file_url || previewMedia.url, e)}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm transition"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleDeleteMedia(previewMedia.id)}
                  className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ảnh này</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
