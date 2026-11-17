import React, { useState, useEffect, useMemo } from 'react';
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
  Lock,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  ListOrdered
} from 'lucide-react';
import { seriesService } from '../../../services/seriesService';
import { mediaService } from '../../../services/mediaService';
import { useApp } from '../../../contexts/AppContext';

export default function SeriesTab({ allPosts = [], onSeriesUpdated }) {
  const { t, showToast } = useApp();
  const [seriesList, setSeriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [selectedSeriesDetail, setSelectedSeriesDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Internal tab in edit form: 'info' (Thông tin) | 'lessons' (Bài học & Sắp ra mắt)
  const [activeFormTab, setActiveFormTab] = useState('info');

  // Main Series Form
  const [seriesForm, setSeriesForm] = useState({
    title: '',
    slug: '',
    description: '',
    cover_image: '',
    level: 'beginner', // beginner, intermediate, advanced
    status: 'updating', // updating, completed, upcoming
    is_published: true, // Show or hide series publicly
    upcoming_lessons: [] // [{ id, title, excerpt, stage, reading_time }]
  });

  // State to assign an existing post to current series
  const [selectedPostToAssign, setSelectedPostToAssign] = useState('');
  const [assignOrderIndex, setAssignOrderIndex] = useState('');
  const [editingOrders, setEditingOrders] = useState({});

  // Auto calculate next order index when detail changes
  useEffect(() => {
    const totalCurrent = (selectedSeriesDetail?.all_posts?.length || selectedSeriesDetail?.posts?.length || 0);
    setAssignOrderIndex(totalCurrent + 1);
  }, [selectedSeriesDetail]);

  // Form state to add an upcoming lesson item
  const [newUpcoming, setNewUpcoming] = useState({
    title: '',
    stage: '',
    excerpt: '',
    reading_time: 5
  });
  const [showAddUpcomingForm, setShowAddUpcomingForm] = useState(false);

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

  // Fetch full details of a series (including attached posts and upcoming roadmap lessons)
  const fetchSeriesDetail = async (seriesItem) => {
    setEditingSeriesId(seriesItem.id);
    setLoadingDetail(true);
    try {
      const res = await seriesService.getSeriesDetail(seriesItem.slug);
      const data = res?.data || res;
      setSelectedSeriesDetail(data);

      setSeriesForm({
        title: data.title || '',
        slug: data.slug || '',
        description: data.description || '',
        cover_image: data.cover_image || '',
        level: data.level || 'beginner',
        status: data.status || 'updating',
        is_published: data.is_published !== undefined ? !!data.is_published : true,
        upcoming_lessons: Array.isArray(data.upcoming_lessons) ? data.upcoming_lessons : []
      });
    } catch (err) {
      console.error('Error fetching series detail:', err);
      setSelectedSeriesDetail(seriesItem);
      setSeriesForm({
        title: seriesItem.title || '',
        slug: seriesItem.slug || '',
        description: seriesItem.description || '',
        cover_image: seriesItem.cover_image || '',
        level: seriesItem.level || 'beginner',
        status: seriesItem.status || 'updating',
        is_published: seriesItem.is_published !== undefined ? !!seriesItem.is_published : true,
        upcoming_lessons: Array.isArray(seriesItem.upcoming_lessons) ? seriesItem.upcoming_lessons : []
      });
    } finally {
      setLoadingDetail(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateNewSeries = () => {
    setEditingSeriesId(null);
    setSelectedSeriesDetail(null);
    setActiveFormTab('info');
    setSeriesForm({
      title: '',
      slug: '',
      description: '',
      cover_image: '',
      level: 'beginner',
      status: 'updating',
      is_published: true,
      upcoming_lessons: []
    });
    setNewUpcoming({ title: '', stage: '', excerpt: '', reading_time: 5 });
    setShowAddUpcomingForm(false);
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
    setSeriesForm((prev) => ({
      ...prev,
      title: val,
      slug: editingSeriesId ? prev.slug : generateSlugFromTitle(val)
    }));
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
        showToast('Tải ảnh bìa thành công!');
      }
    } catch (err) {
      alert(err.message || 'Lỗi tải ảnh');
    } finally {
      setIsUploading(false);
    }
  };

  // Save Series (Create / Update)
  const handleSaveSeries = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!seriesForm.title.trim()) {
      alert('Vui lòng nhập tên Series!');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...seriesForm,
        slug: seriesForm.slug || generateSlugFromTitle(seriesForm.title)
      };

      if (editingSeriesId) {
        await seriesService.updateSeries(editingSeriesId, payload);
        showToast('Cập nhật thông tin Series thành công!');
      } else {
        const res = await seriesService.createSeries(payload);
        const created = res?.data || res;
        showToast('Tạo Series mới thành công!');
        if (created?.id) {
          fetchSeriesDetail(created);
        }
      }
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi lưu Series');
    } finally {
      setIsSaving(false);
    }
  };

  // Safe Delete Series
  const handleDeleteSeries = async (id, title) => {
    const confirmName = window.prompt(
      `CẢNH BÁO: Bạn đang xóa Series "${title}".\nCác bài viết bên trong sẽ KHÔNG bị xóa mà chỉ được gỡ liên kết series.\n\nVui lòng nhập đúng tên Series để xác nhận xóa:`
    );
    if (confirmName !== title) {
      if (confirmName !== null) alert('Tên không khớp. Đã hủy xóa.');
      return;
    }

    try {
      await seriesService.deleteSeries(id);
      showToast('Đã xóa Series thành công!');
      handleCreateNewSeries();
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi xóa Series');
    }
  };

  // Assign existing post to current Series
  const handleAssignPost = async () => {
    if (!selectedPostToAssign) return;
    if (!editingSeriesId) {
      alert('Vui lòng lưu Series trước khi gán bài viết!');
      return;
    }

    try {
      const res = await seriesService.assignPostToSeries(editingSeriesId, {
        post_id: Number(selectedPostToAssign),
        order_index: assignOrderIndex !== '' ? Number(assignOrderIndex) : undefined
      });
      const updated = res?.data || res;
      setSelectedSeriesDetail(updated);
      setSelectedPostToAssign('');
      showToast('Đã thêm bài viết vào Series!');
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi gán bài viết');
    }
  };

  // Handle inline change for post order
  const handleOrderChange = (postId, val) => {
    setEditingOrders(prev => ({ ...prev, [postId]: val }));
  };

  // Save updated order for a single post
  const handleSaveOrder = async (postId) => {
    const val = editingOrders[postId];
    if (val === undefined || val === '') return;
    try {
      const res = await seriesService.assignPostToSeries(editingSeriesId, {
        post_id: Number(postId),
        order_index: Number(val)
      });
      const updated = res?.data || res;
      setSelectedSeriesDetail(updated);
      setEditingOrders(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      showToast('Đã cập nhật thứ tự bài viết!');
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi cập nhật thứ tự');
    }
  };

  // Move post position Up or Down
  const handleMovePost = async (idx, direction) => {
    const posts = [...(selectedSeriesDetail?.all_posts || selectedSeriesDetail?.posts || [])];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= posts.length) return;

    const [moved] = posts.splice(idx, 1);
    posts.splice(targetIdx, 0, moved);

    const items = posts.map((p, i) => ({
      id: p.id,
      order_index: i + 1
    }));

    try {
      const res = await seriesService.reorderSeriesPosts(editingSeriesId, { posts: items });
      const updated = res?.data || res;
      setSelectedSeriesDetail(updated);
      setEditingOrders({});
      showToast('Đã cập nhật thứ tự bài viết!');
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi sắp xếp bài viết');
    }
  };

  // Move Upcoming Lesson Up / Down
  const handleMoveUpcoming = async (idx, direction) => {
    const list = [...(seriesForm.upcoming_lessons || [])];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const [moved] = list.splice(idx, 1);
    list.splice(targetIdx, 0, moved);

    setSeriesForm(prev => ({ ...prev, upcoming_lessons: list }));

    if (editingSeriesId) {
      try {
        await seriesService.updateSeries(editingSeriesId, {
          upcoming_lessons: list
        });
        showToast('Đã cập nhật thứ tự bài dự kiến!');
        fetchSeries();
        if (onSeriesUpdated) onSeriesUpdated();
      } catch (err) {
        console.error('Error updating upcoming lessons order:', err);
      }
    }
  };

  // Remove post from Series
  const handleRemovePostFromSeries = async (postId, postTitle) => {
    if (!window.confirm(`Gỡ bài viết "${postTitle}" ra khỏi Series này? (Bài viết vẫn được giữ nguyên trong kho)`)) return;
    try {
      const res = await seriesService.removePostFromSeries(editingSeriesId, postId);
      const updated = res?.data || res;
      setSelectedSeriesDetail(updated);
      showToast('Đã gỡ bài viết khỏi Series!');
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi gỡ bài viết');
    }
  };

  // Add Upcoming Lesson Item
  const handleAddUpcoming = async () => {
    if (!newUpcoming.title.trim()) {
      alert('Vui lòng nhập tiêu đề bài học dự kiến!');
      return;
    }
    const item = {
      id: `upcoming-${Date.now()}`,
      title: newUpcoming.title.trim(),
      stage: newUpcoming.stage.trim() || `Phần ${(seriesForm.upcoming_lessons?.length || 0) + 2}`,
      excerpt: newUpcoming.excerpt.trim() || 'Nội dung đang được biên soạn và sẽ sớm ra mắt.',
      reading_time: Number(newUpcoming.reading_time) || 5
    };

    const nextUpcoming = [...(seriesForm.upcoming_lessons || []), item];
    const nextForm = { ...seriesForm, upcoming_lessons: nextUpcoming };
    setSeriesForm(nextForm);
    setNewUpcoming({ title: '', stage: '', excerpt: '', reading_time: 5 });
    setShowAddUpcomingForm(false);

    // Auto-save upcoming lessons if series already exists
    if (editingSeriesId) {
      try {
        await seriesService.updateSeries(editingSeriesId, nextForm);
        showToast('Đã lưu bài học dự kiến vào Series!');
        fetchSeries();
        if (onSeriesUpdated) onSeriesUpdated();
      } catch (err) {
        console.error('Error auto-saving upcoming lesson:', err);
      }
    }
  };

  // Remove Upcoming Lesson Item
  const handleRemoveUpcoming = async (id) => {
    const nextUpcoming = (seriesForm.upcoming_lessons || []).filter((u) => u.id !== id);
    const nextForm = { ...seriesForm, upcoming_lessons: nextUpcoming };
    setSeriesForm(nextForm);

    if (editingSeriesId) {
      try {
        await seriesService.updateSeries(editingSeriesId, nextForm);
        showToast('Đã cập nhật danh sách bài học dự kiến!');
        fetchSeries();
        if (onSeriesUpdated) onSeriesUpdated();
      } catch (err) {
        console.error('Error auto-saving upcoming lesson removal:', err);
      }
    }
  };

  // Filter series
  const filteredSeries = useMemo(() => {
    if (!searchFilter.trim()) return seriesList;
    const q = searchFilter.toLowerCase();
    return seriesList.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [seriesList, searchFilter]);

  // Available posts that are NOT currently in this series
  const currentSeriesPostIds = useMemo(() => {
    const postsInSeries = selectedSeriesDetail?.all_posts || selectedSeriesDetail?.posts || [];
    return postsInSeries.map((p) => p.id);
  }, [selectedSeriesDetail]);

  const availablePostsToAssign = useMemo(() => {
    return allPosts.filter((p) => !currentSeriesPostIds.includes(p.id));
  }, [allPosts, currentSeriesPostIds]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* CỘT TRÁI: DANH SÁCH SERIES (7 COLS) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Header & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Danh Sách Chuỗi Bài Viết ({seriesList.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Tìm theo tên series, slug..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 w-48 sm:w-60"
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
              onClick={handleCreateNewSeries}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Series</span>
            </button>
          </div>
        </div>

        {/* Series List */}
        {filteredSeries.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
            <Layers className="w-10 h-10 mx-auto text-zinc-400 stroke-1" />
            <p className="text-sm font-medium text-zinc-500">Chưa có Series nào phù hợp.</p>
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
                    {/* Cover Image Thumbnail */}
                    <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 relative">
                      {s.cover_image ? (
                        <img src={s.cover_image} alt={s.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <Layers className="w-5 h-5 stroke-1" />
                        </div>
                      )}
                      {!s.is_published && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-amber-500 text-[9px] font-bold text-white leading-none shadow-sm">
                          Ẩn
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          onClick={() => fetchSeriesDetail(s)}
                          className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          {s.title}
                        </h3>

                        {/* Level badge */}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700">
                          {s.level === 'advanced'
                            ? 'Chuyên sâu'
                            : s.level === 'intermediate'
                            ? 'Trung cấp'
                            : 'Cơ bản'}
                        </span>

                        {/* Status badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                            : s.status === 'upcoming'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60'
                        }`}>
                          {s.status === 'completed' ? 'Hoàn thành' : s.status === 'upcoming' ? 'Sắp ra mắt' : 'Đang cập nhật'}
                        </span>
                      </div>

                      <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                        /series/{s.slug}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                          <BookOpen className="w-3.5 h-3.5" />
                          {s.total_posts || 0} bài học
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ~{s.total_reading_time || 0} phút đọc
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <a
                      href={`/series/${s.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                      title="Xem trang lộ trình công khai"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => fetchSeriesDetail(s)}
                      className={`p-2 rounded-lg border transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                      title="Chỉnh sửa & quản lý bài học"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSeries(s.id, s.title)}
                      className="p-2 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition"
                      title="Xóa Series"
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

      {/* CỘT PHẢI: FORM CHỈNH SỬA & TÁCH TAB THÔNG TIN / BÀI HỌC (5 COLS STICKY) */}
      <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] flex flex-col">
        {/* Header card */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {editingSeriesId ? 'Chỉnh Sửa Series' : 'Tạo Series Mới'}
            </h2>
            {editingSeriesId && (
              <p
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate mt-0.5"
                title={seriesForm.title}
              >
                Đang sửa: {seriesForm.title}
              </p>
            )}
          </div>
          {editingSeriesId && (
            <button
              onClick={handleCreateNewSeries}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-semibold px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0"
            >
              Hủy chọn
            </button>
          )}
        </div>

        {/* Form Internal Tab Bar (Chỉ hiển thị khi đã chọn Series) */}
        {editingSeriesId && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-5 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveFormTab('info')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeFormTab === 'info'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Thông tin cơ bản</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('lessons')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeFormTab === 'lessons'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Bài học ({selectedSeriesDetail?.all_posts?.length || selectedSeriesDetail?.posts?.length || 0})</span>
            </button>
          </div>
        )}

        {/* Tab 1: Form thông tin cơ bản */}
        {(activeFormTab === 'info' || !editingSeriesId) && (
          <form onSubmit={handleSaveSeries} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tên Series (Lộ trình học) *
              </label>
              <input
                type="text"
                required
                value={seriesForm.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="VD: Lộ trình Xây dựng Web Python Flask từ A-Z"
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Đường dẫn Slug (URL)
              </label>
              <input
                type="text"
                required
                value={seriesForm.slug}
                onChange={(e) => setSeriesForm({ ...seriesForm, slug: e.target.value })}
                placeholder="xay-dung-web-flask-tu-a-z"
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
              {editingSeriesId && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Đổi slug có thể làm hỏng các liên kết bài viết cũ.</span>
                </p>
              )}
            </div>

            {/* Mức độ & Trạng thái */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mức độ
                </label>
                <div className="relative">
                  <select
                    value={seriesForm.level}
                    onChange={(e) => setSeriesForm({ ...seriesForm, level: e.target.value })}
                    className="w-full appearance-none text-xs p-2.5 pr-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                  >
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung cấp</option>
                    <option value="advanced">Chuyên sâu</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Trạng thái
                </label>
                <div className="relative">
                  <select
                    value={seriesForm.status}
                    onChange={(e) => setSeriesForm({ ...seriesForm, status: e.target.value })}
                    className="w-full appearance-none text-xs p-2.5 pr-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                  >
                    <option value="updating">Đang cập nhật</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="upcoming">Sắp ra mắt</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Toggle Bật / Tắt Hiển thị công khai */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                  Hiển thị công khai
                </span>
                <span className="text-xs text-zinc-500 block mt-0.5">
                  {seriesForm.is_published ? 'Hiển thị cho độc giả xem trên trang Series' : 'Tạm ẩn Series khỏi trang công khai'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSeriesForm({ ...seriesForm, is_published: !seriesForm.is_published })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  seriesForm.is_published ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    seriesForm.is_published ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Mô tả lộ trình học tập
              </label>
              <textarea
                rows={2}
                value={seriesForm.description}
                onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                placeholder="Chuỗi bài viết hướng dẫn lập trình..."
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            {/* Ảnh bìa Series kèm nút đổi/xóa/tải lên rõ ràng */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Ảnh bìa Series (Tỉ lệ 16:9 gợi ý)
                </label>
                {seriesForm.cover_image && (
                  <label className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">
                    Đổi ảnh bìa
                    <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                  </label>
                )}
              </div>

              {seriesForm.cover_image ? (
                <div className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video bg-zinc-100 dark:bg-zinc-800 shadow-sm">
                  <img src={seriesForm.cover_image} alt="Cover" className="w-full h-full object-cover" />
                  {/* Overlay hành động luôn hiển thị rõ khi hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-zinc-900 text-xs font-bold shadow-md transition">
                      Đổi ảnh
                      <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setSeriesForm({ ...seriesForm, cover_image: '' })}
                      className="px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold shadow-md transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition">
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {isUploading ? 'Đang tải lên...' : 'Chọn hoặc kéo thả ảnh bìa'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" disabled={isUploading} />
                </label>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {isSaving ? 'Đang lưu...' : editingSeriesId ? 'Lưu Thông Tin Series' : 'Tạo Series Mới'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Quản lý bài học thực tế & bài học dự kiến (Upcoming) */}
        {editingSeriesId && activeFormTab === 'lessons' && (
          <div className="p-5 space-y-6 overflow-y-auto flex-1">
            {/* 1. Gán bài viết có sẵn */}
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Bài học đã phát hành ({selectedSeriesDetail?.all_posts?.length || selectedSeriesDetail?.posts?.length || 0})</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Gán bài viết từ kho bài hoặc gỡ bài khỏi series
                </p>
              </div>

              {/* Selector bài viết đã fix tràn khung với min-w-0 và có ô Thứ tự bài (#) */}
              <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                  + Thêm bài viết có sẵn vào Series:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end min-w-0">
                  <div className="sm:col-span-8 relative min-w-0">
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Chọn bài viết
                    </label>
                    <div className="relative">
                      <select
                        value={selectedPostToAssign}
                        onChange={(e) => setSelectedPostToAssign(e.target.value)}
                        className="w-full min-w-0 appearance-none text-xs p-2.5 pr-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 truncate"
                      >
                        <option value="">-- Chọn bài viết để thêm --</option>
                        {availablePostsToAssign.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="sm:col-span-2 min-w-0">
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Thứ tự (#)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={assignOrderIndex}
                      onChange={(e) => setAssignOrderIndex(e.target.value)}
                      placeholder="1, 2, 3..."
                      className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono font-bold text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAssignPost}
                      disabled={!selectedPostToAssign}
                      className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </div>

              {/* Danh sách các bài viết đang thuộc Series */}
              {loadingDetail ? (
                <div className="p-6 text-center text-xs text-zinc-400">Đang tải danh sách bài...</div>
              ) : (selectedSeriesDetail?.all_posts?.length || selectedSeriesDetail?.posts?.length || 0) === 0 ? (
                <div className="p-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs">
                  Chưa có bài viết nào trong series này. Hãy chọn bài viết ở trên để gán vào!
                </div>
              ) : (
                <div className="space-y-2">
                  {(selectedSeriesDetail?.all_posts || selectedSeriesDetail?.posts || []).map((post, idx, arr) => (
                    <div
                      key={post.id}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Nút di chuyển Thứ tự Lên / Xuống */}
                        <div className="flex flex-col -space-y-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.preventDefault();
                              handleMovePost(idx, -1);
                            }}
                            className="p-0.5 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                            title="Di chuyển lên trên"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={(e) => {
                              e.preventDefault();
                              handleMovePost(idx, 1);
                            }}
                            className="p-0.5 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                            title="Di chuyển xuống dưới"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Ô chỉnh sửa Thứ tự bài (#) giống như Quản lý bài viết */}
                        <div className="flex items-center gap-1 shrink-0" title="Chỉnh sửa thứ tự bài (#) - Nhập số rồi Enter hoặc bấm ra ngoài để lưu">
                          <span className="text-[11px] font-bold text-zinc-400">#</span>
                          <input
                            type="number"
                            min="0"
                            value={editingOrders[post.id] !== undefined ? editingOrders[post.id] : (post.order_index ?? idx + 1)}
                            onChange={(e) => handleOrderChange(post.id, e.target.value)}
                            onBlur={() => handleSaveOrder(post.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveOrder(post.id);
                              }
                            }}
                            className="w-12 text-center font-mono font-bold text-xs p-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {post.title}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {post.reading_time || 1} phút đọc • {post.status === 'published' ? 'Công khai' : 'Nháp'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePostFromSeries(post.id, post.title)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        title="Gỡ khỏi Series"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Quản lý bài học dự kiến (Sắp ra mắt / Upcoming) */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Bài học dự kiến ({seriesForm.upcoming_lessons?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Hiển thị các bài học đang chuẩn bị (khóa bài) trên lộ trình
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUpcomingForm(!showAddUpcomingForm)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {showAddUpcomingForm ? 'Đóng form' : '+ Thêm bài dự kiến'}
                </button>
              </div>

              {/* Form thêm Upcoming lesson */}
              {showAddUpcomingForm && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
                  <input
                    type="text"
                    value={newUpcoming.title}
                    onChange={(e) => setNewUpcoming({ ...newUpcoming, title: e.target.value })}
                    placeholder="Tiêu đề bài học dự kiến..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newUpcoming.stage}
                      onChange={(e) => setNewUpcoming({ ...newUpcoming, stage: e.target.value })}
                      placeholder="Phần 2: Database..."
                      className="text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                    <input
                      type="number"
                      value={newUpcoming.reading_time}
                      onChange={(e) => setNewUpcoming({ ...newUpcoming, reading_time: e.target.value })}
                      placeholder="Số phút đọc dự kiến"
                      className="text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newUpcoming.excerpt}
                    onChange={(e) => setNewUpcoming({ ...newUpcoming, excerpt: e.target.value })}
                    placeholder="Tóm tắt ngắn nội dung sẽ học..."
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddUpcoming}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
                  >
                    Lưu bài học dự kiến
                  </button>
                </div>
              )}

              {/* Danh sách Upcoming Lessons */}
              {seriesForm.upcoming_lessons && seriesForm.upcoming_lessons.length > 0 && (
                <div className="space-y-2">
                  {seriesForm.upcoming_lessons.map((item, idx, arr) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Nút di chuyển lên / xuống cho bài dự kiến */}
                        <div className="flex flex-col -space-y-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.preventDefault();
                              handleMoveUpcoming(idx, -1);
                            }}
                            className="p-0.5 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                            title="Di chuyển lên trên"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={(e) => {
                              e.preventDefault();
                              handleMoveUpcoming(idx, 1);
                            }}
                            className="p-0.5 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                            title="Di chuyển xuống dưới"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase">
                            {item.stage || `Dự kiến #${idx + 1}`}
                          </span>
                          <p className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            ~{item.reading_time || 5} phút đọc • {item.excerpt}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveUpcoming(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        title="Xóa mục dự kiến"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
