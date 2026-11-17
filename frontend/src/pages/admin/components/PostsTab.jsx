import React, { useState, useEffect } from 'react';
import { Eye, Edit3, Trash2, Upload, Loader2, X, Image as ImageIcon, Layers } from 'lucide-react';
import { postApi, mediaApi, seriesApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

export default function PostsTab({ posts, onPostsUpdated }) {
  const { t } = useApp();

  const [seriesList, setSeriesList] = useState([]);
  const [newPost, setNewPost] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    thumbnail: '',
    language: 'vi',
    status: 'draft',
    tags: 'python, web',
    series_id: '',
    order_index: 0
  });
  const [editingPostId, setEditingPostId] = useState(null);
  const [previewToken, setPreviewToken] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  useEffect(() => {
    // Fetch series list for dropdown
    seriesApi.getSeriesList()
      .then((res) => {
        const data = res?.data || res;
        setSeriesList(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumbnail(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await mediaApi.upload(formData);
      const data = res?.data || res;
      const url = data?.watermark_url || data?.file_url || data?.url;
      if (url) {
        setNewPost((prev) => ({
          ...prev,
          thumbnail: url
        }));
      } else {
        alert('Tải ảnh thành công nhưng không lấy được đường dẫn ảnh.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setUploadingThumbnail(false);
      e.target.value = '';
    }
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      ...newPost,
      cover_image: newPost.thumbnail,
      lang: newPost.language,
      series_id: newPost.series_id ? parseInt(newPost.series_id, 10) : null,
      order_index: parseInt(newPost.order_index, 10) || 0,
      tags: typeof newPost.tags === 'string' ? newPost.tags.split(',').map((s) => s.trim()).filter(Boolean) : newPost.tags
    };

    try {
      if (editingPostId) {
        await postApi.updatePost(editingPostId, payload);
      } else {
        await postApi.createPost(payload);
      }
      setEditingPostId(null);
      setNewPost({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        thumbnail: '',
        language: 'vi',
        status: 'draft',
        tags: 'python, web',
        series_id: '',
        order_index: 0
      });
      if (onPostsUpdated) onPostsUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await postApi.deletePost(id);
      if (onPostsUpdated) onPostsUpdated();
    } catch (err) {
      alert('Error deleting post');
    }
  };

  const handleGeneratePreview = async (slug) => {
    try {
      const res = await postApi.getPreviewToken(slug);
      const data = res?.data || res;
      const token = data?.preview_token || data?.token;
      if (token) {
        setPreviewToken({ slug, token });
        window.open(`/blog/${slug}?preview=${token}`, '_blank');
      } else {
        alert('Failed to extract preview token');
      }
    } catch (err) {
      alert('Failed to generate preview token');
    }
  };

  const startEditPost = async (post) => {
    setEditingPostId(post.id);
    setNewPost({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      thumbnail: post.thumbnail || post.cover_image || '',
      language: post.language || post.lang || 'vi',
      status: post.status || 'draft',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
      series_id: post.series_id || '',
      order_index: post.order_index || 0
    });

    if (!post.content) {
      try {
        const res = await postApi.getAdminPostById(post.id);
        const data = res?.data || res;
        if (data && data.content) {
          setNewPost((prev) => ({
            ...prev,
            content: data.content,
            excerpt: data.excerpt || prev.excerpt,
            thumbnail: data.cover_image || data.thumbnail || prev.thumbnail,
            language: data.lang || data.language || prev.language,
            series_id: data.series_id || prev.series_id,
            order_index: data.order_index ?? prev.order_index,
            tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || prev.tags)
          }));
        }
      } catch (err) {
        console.error('Failed to fetch full post content:', err);
      }
    }
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setNewPost({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      thumbnail: '',
      language: 'vi',
      status: 'draft',
      tags: 'python, web',
      series_id: '',
      order_index: 0
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Posts List */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('admin.all_posts')}</h2>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
          {posts.map((post) => (
            <div key={post.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      post.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}
                  >
                    {post.status === 'published' ? t('admin.published') : t('admin.draft')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">{post.language}</span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{post.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">/{post.slug} • {post.views} views</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {post.status === 'draft' && (
                  <button
                    onClick={() => handleGeneratePreview(post.slug)}
                    title="Generate Preview Token"
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('admin.preview')}
                  </button>
                )}
                <button
                  onClick={() => startEditPost(post)}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {previewToken && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl">
            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">{t('admin.preview_url_notice')}</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/blog/${previewToken.slug}?preview=${previewToken.token}`}
                className="w-full text-xs font-mono p-2 rounded bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900"
              />
              <a
                href={`/blog/${previewToken.slug}?preview=${previewToken.token}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-indigo-600 text-white rounded text-xs font-semibold whitespace-nowrap"
              >
                {t('admin.open')}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Post Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          {editingPostId ? t('admin.edit_post') : t('admin.create_post')}
        </h2>
        <form onSubmit={handleSavePost} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{t('admin.title')}</label>
            <input
              type="text"
              required
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{t('admin.slug')}</label>
            <input
              type="text"
              value={newPost.slug}
              onChange={(e) => setNewPost({ ...newPost, slug: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{t('admin.language')}</label>
              <select
                value={newPost.language}
                onChange={(e) => setNewPost({ ...newPost, language: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="vi" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Tiếng Việt</option>
                <option value="en" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">English</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{t('admin.status')}</label>
              <select
                value={newPost.status}
                onChange={(e) => setNewPost({ ...newPost, status: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="draft" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{t('admin.draft')}</option>
                <option value="published" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{t('admin.published')}</option>
              </select>
            </div>
          </div>

          {/* Series & Lesson Order Assignment */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Gán vào Series (Lộ trình)</span>
              </label>
              <select
                value={newPost.series_id || ''}
                onChange={(e) => setNewPost({ ...newPost, series_id: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="">-- Không thuộc Series nào --</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Thứ tự bài (#)
              </label>
              <input
                type="number"
                min="0"
                value={newPost.order_index}
                onChange={(e) => setNewPost({ ...newPost, order_index: e.target.value })}
                placeholder="1, 2, 3..."
                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              {t('admin.thumbnail')}
            </label>

            {newPost.thumbnail ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 group">
                <img
                  src={newPost.thumbnail}
                  alt="Post cover thumbnail"
                  className="w-full h-36 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-zinc-900 text-xs font-semibold cursor-pointer shadow transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t('admin.change_image')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingThumbnail}
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPost({ ...newPost, thumbnail: '' })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t('admin.remove_image')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  uploadingThumbnail
                    ? 'border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 cursor-wait'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                {uploadingThumbnail ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    <span className="text-xs text-zinc-500 font-medium">{t('admin.uploading')}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <Upload className="w-5 h-5 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-1" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('admin.upload_thumbnail_title')}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      {t('admin.upload_thumbnail_hint')}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingThumbnail}
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{t('admin.tags')}</label>
            <input
              type="text"
              value={newPost.tags}
              onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
              placeholder="react, python, security"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{t('admin.excerpt')}</label>
            <textarea
              rows={2}
              value={newPost.excerpt}
              onChange={(e) => setNewPost({ ...newPost, excerpt: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{t('admin.content')}</label>
            <textarea
              rows={6}
              required
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              {editingPostId ? t('admin.btn_update') : t('admin.btn_save')}
            </button>
            {editingPostId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
              >
                {t('admin.btn_cancel')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
