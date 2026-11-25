import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye, Edit3, Trash2, Upload, Loader2, X, Image as ImageIcon,
  Layers, Lock, Globe, Users, ShieldAlert, UserCheck, AlertTriangle,
  UserX, Search, Plus, Calendar, Clock
} from 'lucide-react';
import { postApi, mediaApi, seriesApi } from '../../../services/api';
import userService from '../../../services/userService';
import { useApp } from '../../../contexts/AppContext';
import PaginationControl from './PaginationControl';
import NotionEditor from './NotionEditor';

export default function PostsTab({ posts = [], onPostsUpdated }) {
  const { t } = useApp();

  const [seriesList, setSeriesList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Phân trang & Tùy chọn số lượng dòng (pageSize)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Form State
  const initialPostState = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    thumbnail: '',
    language: 'vi',
    status: 'draft',
    visibility: 'public',
    allowed_user_ids: [],
    allowed_roles: [],
    excluded_user_ids: [],
    tags: 'python, web',
    series_id: '',
    order_index: 0
  };
  const [newPost, setNewPost] = useState(initialPostState);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [excludeSearchQuery, setExcludeSearchQuery] = useState('');
  const [previewToken, setPreviewToken] = useState(null);

  useEffect(() => {
    seriesApi.getSeriesList()
      .then((res) => {
        const data = res?.data || res;
        setSeriesList(Array.isArray(data) ? data : []);
      })
      .catch(console.error);

    userService.getAdminUsers({ limit: 100 })
      .then((res) => {
        const data = res?.data || res;
        const uList = Array.isArray(data) ? data : (data?.users || []);
        setAllUsersList(uList);
      })
      .catch(console.error);
  }, []);

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return (posts || []).filter((post) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        post.title?.toLowerCase().includes(q) ||
        post.slug?.toLowerCase().includes(q) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(q));
      const matchVisibility = visibilityFilter === 'all' || post.visibility === visibilityFilter;
      const matchStatus = statusFilter === 'all' || post.status === statusFilter;
      return matchSearch && matchVisibility && matchStatus;
    });
  }, [posts, searchTerm, visibilityFilter, statusFilter]);

  // Reset trang 1 khi lọc hoặc đổi pageSize
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, visibilityFilter, statusFilter, pageSize]);

  // Dữ liệu phân trang
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, currentPage, pageSize]);

  const handleOpenCreateModal = () => {
    setEditingPostId(null);
    setNewPost(initialPostState);
    setUserSearchQuery('');
    setExcludeSearchQuery('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (post) => {
    setEditingPostId(post.id);
    const allowedUids = (post.allowed_users || []).map((u) => u.user_id);
    const excludedUids = (post.excluded_users || []).map((u) => u.user_id);
    
    setNewPost({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      thumbnail: post.thumbnail || post.cover_image || '',
      language: post.language || post.lang || 'vi',
      status: post.status || 'draft',
      visibility: post.visibility || 'public',
      allowed_user_ids: allowedUids,
      allowed_roles: post.allowed_roles || [],
      excluded_user_ids: excludedUids,
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
      series_id: post.series_id || '',
      order_index: post.order_index || 0
    });
    setIsModalOpen(true);

    if (!post.content) {
      try {
        const res = await postApi.getAdminPostById(post.id);
        const data = res?.data || res;
        if (data) {
          const uids = (data.allowed_users || []).map((u) => u.user_id);
          const exUids = (data.excluded_users || []).map((u) => u.user_id);
          setNewPost((prev) => ({
            ...prev,
            content: data.content || prev.content,
            excerpt: data.excerpt || prev.excerpt,
            thumbnail: data.cover_image || data.thumbnail || prev.thumbnail,
            language: data.lang || data.language || prev.language,
            visibility: data.visibility || prev.visibility,
            allowed_user_ids: uids.length > 0 ? uids : prev.allowed_user_ids,
            allowed_roles: data.allowed_roles || prev.allowed_roles,
            excluded_user_ids: exUids.length > 0 ? exUids : prev.excluded_user_ids,
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

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingThumbnail(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apply_watermark', 'true');

    try {
      const res = await mediaApi.upload(formData);
      const data = res?.data || res;
      const uploadedUrl = data?.file?.watermarked_url || data?.file?.url || data?.url;

      if (uploadedUrl) {
        setNewPost((prev) => ({ ...prev, thumbnail: uploadedUrl }));
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
      visibility: newPost.visibility || 'public',
      allowed_user_ids: newPost.visibility === 'custom' ? newPost.allowed_user_ids : [],
      allowed_roles: newPost.visibility === 'role' ? newPost.allowed_roles : [],
      excluded_user_ids: newPost.excluded_user_ids || [],
      cover_image: newPost.thumbnail,
      lang: newPost.language,
      series_id: newPost.series_id ? parseInt(newPost.series_id, 10) : null,
      order_index: parseInt(newPost.order_index, 10) || 0,
      tags: typeof newPost.tags === 'string' ? newPost.tags.split(',').map((s) => s.trim()).filter(Boolean) : newPost.tags
    };

    if (editingPostId && newPost.visibility !== 'public' && newPost.series_id) {
      const confirmChange = window.confirm(
        'CẢNH BÁO: Bài viết này đang thuộc một Series công khai. Chuyển sang chế độ Riêng tư sẽ làm ẩn bài viết này đối với người dùng không được phân quyền.\n\nBạn có chắc chắn muốn tiếp tục?'
      );
      if (!confirmChange) {
        setIsSaving(false);
        return;
      }
    }

    try {
      if (editingPostId) {
        await postApi.updatePost(editingPostId, payload);
      } else {
        await postApi.createPost(payload);
      }
      setIsModalOpen(false);
      setEditingPostId(null);
      setNewPost(initialPostState);
      if (onPostsUpdated) onPostsUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err?.message || 'Error saving post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;
    try {
      await postApi.deletePost(id);
      if (onPostsUpdated) onPostsUpdated();
    } catch (err) {
      alert('Error deleting post');
    }
  };

  const handleGeneratePreview = async (slug, e) => {
    if (e) e.stopPropagation();
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{t('admin.all_posts')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
              {filteredPosts.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Nhấp trực tiếp vào bài viết để mở popup xem chi tiết & chỉnh sửa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm bài viết, slug..."
              className="text-xs pl-8 pr-7 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
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

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium"
          >
            <option value="all">Tất cả quyền</option>
            <option value="public">🌐 Public</option>
            <option value="logged_in">🔒 Thành viên</option>
            <option value="custom">👤 Whitelist</option>
            <option value="role">⭐ Roles</option>
            <option value="unlisted">🔗 Unlisted</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã công khai</option>
            <option value="draft">Bản nháp</option>
          </select>

          {/* Create Button */}
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bài mới</span>
          </button>
        </div>
      </div>

      {/* Posts Full-Width List */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <p className="text-sm font-medium">Không tìm thấy bài viết nào phù hợp.</p>
          </div>
        ) : (
          paginatedPosts.map((post) => {
            const seriesInfo = seriesList.find((s) => s.id === post.series_id);
            return (
              <div
                key={post.id}
                onClick={() => handleOpenEditModal(post)}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Thumbnail */}
                  <div className="w-16 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                    {post.cover_image || post.thumbnail ? (
                      <img src={post.cover_image || post.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          post.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {post.status === 'published' ? t('admin.published') : t('admin.draft')}
                      </span>

                      {/* Visibility Badges */}
                      {post.visibility === 'public' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      )}
                      {post.visibility === 'logged_in' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Thành viên
                        </span>
                      )}
                      {post.visibility === 'role' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Vai trò {post.allowed_roles?.length ? `(${post.allowed_roles.join(', ')})` : ''}
                        </span>
                      )}
                      {post.visibility === 'custom' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Whitelist ({post.allowed_user_ids?.length || post.allowed_users?.length || 0})
                        </span>
                      )}
                      {post.visibility === 'unlisted' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 flex items-center gap-1">
                          🔗 Unlisted
                        </span>
                      )}
                      {post.excluded_users?.length > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 flex items-center gap-1">
                          <UserX className="w-3 h-3" /> Exclude ({post.excluded_users.length})
                        </span>
                      )}

                      {seriesInfo && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 flex items-center gap-1 truncate max-w-[150px]">
                          <Layers className="w-2.5 h-2.5" />
                          <span className="truncate">{seriesInfo.title}</span>
                        </span>
                      )}

                      <span className="text-[10px] uppercase font-bold text-zinc-400">{post.language || post.lang}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {post.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      /{post.slug} • {post.views || 0} views • {post.reading_time || 1} min read
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  {post.status === 'draft' && (
                    <button
                      onClick={(e) => handleGeneratePreview(post.slug, e)}
                      title="Generate Preview Token"
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{t('admin.preview')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEditModal(post)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                  <button
                    onClick={(e) => handleDeletePost(post.id, e)}
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                    title="Xóa bài viết"
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
          totalItems={filteredPosts.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="bài viết"
          itemLabelEn="posts"
        />
      </div>

      {/* POPUP MODAL FOR CREATE / EDIT POST */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {editingPostId ? 'Chỉnh Sửa Bài Viết' : 'Tạo Bài Viết Mới'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {editingPostId ? `Đang chỉnh sửa bài ID #${editingPostId}` : 'Nhập thông tin bài viết và phân quyền'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSavePost} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {t('admin.title')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tiêu đề bài viết..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {t('admin.slug')}
                  </label>
                  <input
                    type="text"
                    value={newPost.slug}
                    onChange={(e) => setNewPost({ ...newPost, slug: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="tu-dong-sinh-neu-bo-trong"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {t('admin.language')}
                  </label>
                  <select
                    value={newPost.language}
                    onChange={(e) => setNewPost({ ...newPost, language: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {t('admin.status')}
                  </label>
                  <select
                    value={newPost.status}
                    onChange={(e) => setNewPost({ ...newPost, status: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="draft">{t('admin.draft')}</option>
                    <option value="published">{t('admin.published')}</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {t('admin.tags')}
                  </label>
                  <input
                    type="text"
                    value={newPost.tags}
                    onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                    placeholder="react, python, security"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Phân quyền truy cập (Visibility & Exclude) */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Quyền truy cập (Post Visibility)</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-normal">Stealth Mode</span>
                    </label>
                    <select
                      value={newPost.visibility}
                      onChange={(e) => setNewPost({ ...newPost, visibility: e.target.value })}
                      className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium"
                    >
                      <option value="public">🌐 Công khai (Public - Mọi người)</option>
                      <option value="logged_in">🔒 Thành viên đăng nhập (Logged-in)</option>
                      <option value="role">⭐ Theo vai trò (Roles)</option>
                      <option value="custom">👤 Chỉ định người dùng (Whitelist cụ thể)</option>
                      <option value="unlisted">🔗 Không công khai (Unlisted - Chỉ ai có link)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Gán vào Series (Lộ trình)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={newPost.series_id || ''}
                        onChange={(e) => setNewPost({ ...newPost, series_id: e.target.value })}
                        className="col-span-2 text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium"
                      >
                        <option value="">-- Không gán Series --</option>
                        {seriesList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={newPost.order_index}
                        onChange={(e) => setNewPost({ ...newPost, order_index: e.target.value })}
                        placeholder="Thứ tự #"
                        className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Role Checklist when visibility === 'role' */}
                {newPost.visibility === 'role' && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
                    <span className="text-[11px] font-medium text-zinc-500">Chọn vai trò được phép đọc:</span>
                    <div className="flex gap-4">
                      {['admin', 'user'].map((r) => (
                        <label key={r} className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newPost.allowed_roles.includes(r)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewPost({
                                ...newPost,
                                allowed_roles: checked
                                  ? [...newPost.allowed_roles, r]
                                  : newPost.allowed_roles.filter((role) => role !== r)
                              });
                            }}
                            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="capitalize">{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Whitelist Users Picker when visibility === 'custom' */}
                {newPost.visibility === 'custom' && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <span className="text-[11px] font-medium text-zinc-500">Chọn người dùng (Whitelist cụ thể):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {newPost.allowed_user_ids.map((uid) => {
                        const u = allUsersList.find((usr) => usr.id === uid) || { id: uid, username: `ID #${uid}` };
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                          >
                            <span>{u.username}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setNewPost({
                                  ...newPost,
                                  allowed_user_ids: newPost.allowed_user_ids.filter((id) => id !== uid)
                                });
                              }}
                              className="hover:text-red-500 font-bold ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                      {newPost.allowed_user_ids.length === 0 && (
                        <span className="text-[11px] text-amber-500 italic">Chưa chọn user nào.</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Tìm username hoặc email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                      {userSearchQuery.trim() && (
                        <div className="max-h-24 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-xs">
                          {allUsersList
                            .filter(
                              (u) =>
                                !newPost.allowed_user_ids.includes(u.id) &&
                                (u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                 u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()))
                            )
                            .slice(0, 5)
                            .map((u) => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setNewPost({
                                    ...newPost,
                                    allowed_user_ids: [...newPost.allowed_user_ids, u.id]
                                  });
                                  setUserSearchQuery('');
                                }}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                              >
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">{u.username}</span>
                                <span className="text-[10px] text-zinc-400">{u.email}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Exclude Users Picker */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  <label className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UserX className="w-3.5 h-3.5" />
                      <span>Loại trừ người dùng (Exclude Users)</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal">Chặn khách & User chỉ định</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {newPost.excluded_user_ids.map((uid) => {
                      const u = allUsersList.find((usr) => usr.id === uid) || { id: uid, username: `ID #${uid}` };
                      return (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        >
                          <UserX className="w-3 h-3 text-rose-500" />
                          <span>{u.username}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewPost({
                                ...newPost,
                                excluded_user_ids: newPost.excluded_user_ids.filter((id) => id !== uid)
                              });
                            }}
                            className="hover:text-red-600 font-bold ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                    {newPost.excluded_user_ids.length === 0 ? (
                      <span className="text-[10px] text-zinc-400 italic">Không có người dùng nào bị loại trừ.</span>
                    ) : (
                      <p className="w-full text-[10px] text-amber-500 italic mt-0.5">
                        * Khách chưa có tài khoản và {newPost.excluded_user_ids.length} tài khoản trên sẽ không xem được bài viết này.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Thêm tài khoản cần loại trừ (username/email)..."
                      value={excludeSearchQuery}
                      onChange={(e) => setExcludeSearchQuery(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    {excludeSearchQuery.trim() && (
                      <div className="max-h-24 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-xs">
                        {allUsersList
                          .filter(
                            (u) =>
                              !newPost.excluded_user_ids.includes(u.id) &&
                              (u.username?.toLowerCase().includes(excludeSearchQuery.toLowerCase()) ||
                               u.email?.toLowerCase().includes(excludeSearchQuery.toLowerCase()))
                          )
                          .slice(0, 5)
                          .map((u) => (
                            <div
                              key={u.id}
                              onClick={() => {
                                setNewPost({
                                  ...newPost,
                                  excluded_user_ids: [...newPost.excluded_user_ids, u.id]
                                });
                                setExcludeSearchQuery('');
                              }}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer flex items-center justify-between text-rose-700 dark:text-rose-300"
                            >
                              <span className="font-medium">{u.username}</span>
                              <span className="text-[10px] text-zinc-400">{u.email}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t('admin.thumbnail')}
                </label>
                {newPost.thumbnail ? (
                  <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 group h-36">
                    <img src={newPost.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-zinc-900 text-xs font-semibold cursor-pointer shadow transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Đổi ảnh</span>
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      uploadingThumbnail
                        ? 'border-indigo-400 bg-indigo-50/20 cursor-wait'
                        : 'border-zinc-300 dark:border-zinc-800 hover:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-950/40'
                    }`}
                  >
                    {uploadingThumbnail ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                        <span className="text-xs text-zinc-500">Đang tải ảnh...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 text-center">
                        <Upload className="w-4 h-4 text-zinc-400 mb-1" />
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tải ảnh bìa lên</span>
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

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  {t('admin.excerpt')}
                </label>
                <textarea
                  rows={2}
                  value={newPost.excerpt}
                  onChange={(e) => setNewPost({ ...newPost, excerpt: e.target.value })}
                  placeholder="Mô tả tóm tắt nội dung bài viết..."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Content Notion / Markdown Editor */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t('admin.content')} (Notion / Markdown) *
                </label>
                <NotionEditor
                  value={newPost.content}
                  onChange={(md) => setNewPost((prev) => ({ ...prev, content: md }))}
                />
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPostId ? t('admin.btn_update') : t('admin.btn_save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
