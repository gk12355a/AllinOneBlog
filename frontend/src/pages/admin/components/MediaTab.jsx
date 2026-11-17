import React, { useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

export default function MediaTab({ mediaList, onMediaUpdated }) {
  const { t } = useApp();
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const handleDeleteMedia = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await mediaApi.deleteMedia(id);
      if (onMediaUpdated) onMediaUpdated();
    } catch (err) {
      alert('Error deleting media');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <h3 className="text-base font-bold mb-2">{t('admin.upload_title')}</h3>
        <p className="text-xs text-zinc-500 mb-4">{t('admin.upload_subtitle')}</p>
        <form onSubmit={handleUploadMedia} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setUploadFile(e.target.files[0])}
            className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:bg-zinc-200"
          />
          <button
            type="submit"
            disabled={!uploadFile || uploading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? t('admin.uploading') : t('admin.upload_btn')}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {mediaList.map((m) => (
          <div
            key={m.id}
            className="group relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
          >
            <img
              src={m.watermark_url || m.file_url || m.url}
              alt={m.filename}
              className="w-full h-36 object-cover"
            />
            <div className="p-2">
              <p className="text-[11px] font-medium truncate text-zinc-700 dark:text-zinc-300">{m.filename}</p>
              <p className="text-[10px] text-zinc-400">{(m.file_size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => handleDeleteMedia(m.id)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition"
              title="Delete media"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
