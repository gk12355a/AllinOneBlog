import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  BookOpen,
  Clock,
  Upload,
  X,
  Check,
  Search,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  Video as VideoIcon,
  HelpCircle,
  FileText,
  FolderPlus,
  ArrowUpDown,
  Sparkles,
  Edit3
} from 'lucide-react';
import { seriesService } from '../../../services/seriesService';
import { mediaService } from '../../../services/mediaService';
import { useApp } from '../../../contexts/AppContext';
import PaginationControl from './PaginationControl';

export default function SeriesTab({ allPosts = [], allVideos = [], onSeriesUpdated }) {
  const { t, showToast } = useApp();
  const [seriesList, setSeriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [selectedSeriesDetail, setSelectedSeriesDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Phân trang & Tùy chọn số lượng dòng (pageSize)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Internal tab in edit form: 'info' (Thông tin) | 'curriculum' (Bài học & Lộ trình)
  const [activeFormTab, setActiveFormTab] = useState('info');

  // Main Series Form
  const [seriesForm, setSeriesForm] = useState({
    title: '',
    slug: '',
    description: '',
    cover_image: '',
    level: 'beginner',
    status: 'updating',
    is_published: true
  });

  // State for Add Item to Curriculum
  const [itemTypeTab, setItemTypeTab] = useState('post'); // 'post' | 'video' | 'placeholder'
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedPostId, setSelectedPostId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [sectionTitleInput, setSectionTitleInput] = useState('');
  
  // State for adding Placeholder
  const [placeholderData, setPlaceholderData] = useState({
    title: '',
    duration: '5 phút đọc',
    note: '',
    section_title: ''
  });

  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

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

  const fetchSeriesDetail = async (seriesItem) => {
    setEditingSeriesId(seriesItem.id);
    setLoadingDetail(true);
    setIsModalOpen(true);
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
        is_published: data.is_published !== undefined ? !!data.is_published : true
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
        is_published: seriesItem.is_published !== undefined ? !!seriesItem.is_published : true
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateNewSeries = () => {
    setEditingSeriesId(null);
    setSelectedSeriesDetail(null);
    setActiveFormTab('info');
    setIsModalOpen(true);
    setSeriesForm({
      title: '',
      slug: '',
      description: '',
      cover_image: '',
      level: 'beginner',
      status: 'updating',
      is_published: true
    });
    setSelectedPostId('');
    setSelectedVideoId('');
    setPlaceholderData({ title: '', duration: '5 phút đọc', note: '', section_title: '' });
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
      slug: !editingSeriesId ? generateSlugFromTitle(val) : prev.slug
    }));
  };

  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await mediaService.uploadMedia(file, 'series');
      const url = res.data?.url || res.url;
      if (url) {
        setSeriesForm((prev) => ({ ...prev, cover_image: url }));
        showToast('Tải ảnh bìa thành công!');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi tải ảnh');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSeries = async (e) => {
    e.preventDefault();
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

  const handleDeleteSeries = async (id, title, e) => {
    if (e) e.stopPropagation();
    const confirmName = window.prompt(
      `CẢNH BÁO: Bạn đang xóa Series "${title}".\nCác bài viết và video bên trong sẽ KHÔNG bị xóa mà chỉ được gỡ liên kết series.\n\nVui lòng nhập đúng tên Series để xác nhận xóa:`
    );
    if (confirmName !== title) {
      if (confirmName !== null) alert('Tên không khớp. Đã hủy xóa.');
      return;
    }

    try {
      await seriesService.deleteSeries(id);
      showToast('Đã xóa Series thành công!');
      if (editingSeriesId === id) {
        setIsModalOpen(false);
      }
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi xóa Series');
    }
  };

  // Get current assigned IDs in series
  const currentItems = selectedSeriesDetail?.items || [];

  const assignedPostIds = useMemo(() => {
    return currentItems.filter(it => it.item_type === 'post' && it.item_id).map(it => it.item_id);
  }, [currentItems]);

  const assignedVideoIds = useMemo(() => {
    return currentItems.filter(it => it.item_type === 'video' && it.item_id).map(it => it.item_id);
  }, [currentItems]);

  // Filter available posts & videos
  const availablePosts = useMemo(() => {
    return allPosts.filter(p => !assignedPostIds.includes(p.id));
  }, [allPosts, assignedPostIds]);

  const availableVideos = useMemo(() => {
    return allVideos.filter(v => !assignedVideoIds.includes(v.id));
  }, [allVideos, assignedVideoIds]);

  // Filtered lists for selector
  const filteredAvailablePosts = useMemo(() => {
    if (!itemSearchQuery.trim()) return availablePosts;
    const q = itemSearchQuery.toLowerCase();
    return availablePosts.filter(p => p.title.toLowerCase().includes(q));
  }, [availablePosts, itemSearchQuery]);

  const filteredAvailableVideos = useMemo(() => {
    if (!itemSearchQuery.trim()) return availableVideos;
    const q = itemSearchQuery.toLowerCase();
    return availableVideos.filter(v => v.title.toLowerCase().includes(q));
  }, [availableVideos, itemSearchQuery]);

  // Add Item (Post, Video, or Placeholder)
  const handleAddItem = async () => {
    if (!editingSeriesId) return;
    setIsSubmittingItem(true);
    try {
      let payload = {
        item_type: itemTypeTab,
        section_title: sectionTitleInput.trim()
      };

      if (itemTypeTab === 'post') {
        if (!selectedPostId) {
          alert('Vui lòng chọn bài viết!');
          setIsSubmittingItem(false);
          return;
        }
        const post = allPosts.find(p => p.id === Number(selectedPostId));
        payload.item_id = Number(selectedPostId);
        payload.title_override = post?.title || '';
        payload.duration = `${post?.reading_time || 5} phút đọc`;
      } else if (itemTypeTab === 'video') {
        if (!selectedVideoId) {
          alert('Vui lòng chọn video!');
          setIsSubmittingItem(false);
          return;
        }
        const vid = allVideos.find(v => v.id === Number(selectedVideoId));
        payload.item_id = Number(selectedVideoId);
        payload.title_override = vid?.title || '';
        payload.duration = vid?.duration || '10:00';
      } else if (itemTypeTab === 'placeholder') {
        if (!placeholderData.title.trim()) {
          alert('Vui lòng nhập tiêu đề bài học dự kiến!');
          setIsSubmittingItem(false);
          return;
        }
        payload.title_override = placeholderData.title.trim();
        payload.duration = placeholderData.duration.trim() || '5 phút đọc';
        payload.note = placeholderData.note.trim();
        if (placeholderData.section_title.trim()) {
          payload.section_title = placeholderData.section_title.trim();
        }
      }

      const res = await seriesService.addItem(editingSeriesId, payload);
      const updated = res?.data || res;
      setSelectedSeriesDetail(updated);

      // Reset form fields
      setSelectedPostId('');
      setSelectedVideoId('');
      setItemSearchQuery('');
      setPlaceholderData({ title: '', duration: '5 phút đọc', note: '', section_title: '' });
      showToast('Đã thêm vào lộ trình học tập!');
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi thêm bài học');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Remove Item from Series
  const handleRemoveItem = async (itemId, title) => {
    if (!window.confirm(`Gỡ mục "${title}" khỏi chuỗi bài học?\n(Bài viết / Video gốc sẽ không bị xóa)`)) {
      return;
    }
    try {
      const res = await seriesService.removeItem(editingSeriesId, itemId);
      const updated = res?.data || res;
      setSelectedSeriesDetail(updated);
      showToast('Đã gỡ mục khỏi Series!');
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi gỡ mục');
    }
  };

  // Move Item Up / Down
  const handleMoveItem = async (index, direction) => {
    const items = [...currentItems];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Swap
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    // Build payload
    const payloadItems = items.map((it, idx) => ({
      id: it.id,
      position: idx + 1,
      section_title: it.section_title || ''
    }));

    try {
      // Optimistic update
      setSelectedSeriesDetail(prev => ({ ...prev, items }));
      const res = await seriesService.reorderItems(editingSeriesId, payloadItems);
      const updated = res?.data || res;
      setSelectedSeriesDetail(updated);
      showToast('Đã cập nhật thứ tự lộ trình!');
      fetchSeries();
      if (onSeriesUpdated) onSeriesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi sắp xếp');
      fetchSeriesDetail(selectedSeriesDetail);
    }
  };

  // Filter series list
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

  // Reset trang 1 khi lọc hoặc đổi pageSize
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, pageSize]);

  // Dữ liệu phân trang
  const paginatedSeries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSeries.slice(start, start + pageSize);
  }, [filteredSeries, currentPage, pageSize]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Lộ Trình & Series</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
              {filteredSeries.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Nhấp trực tiếp vào series để mở popup quản lý nội dung & lộ trình học tập.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm series, slug..."
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
            onClick={handleCreateNewSeries}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo mới</span>
          </button>
        </div>
      </div>

      {/* Series Full-Width List */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredSeries.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-2">
            <Layers className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 stroke-1" />
            <p className="text-sm font-medium">Chưa có Series nào phù hợp.</p>
          </div>
        ) : (
          paginatedSeries.map((s) => (
            <div
              key={s.id}
              onClick={() => fetchSeriesDetail(s)}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                  {s.cover_image ? (
                    <img src={s.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-6 h-6 text-zinc-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-block w-2 h-2 rounded-full ${s.is_published ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {s.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize">
                      {s.level || 'beginner'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      {s.status === 'completed' ? 'Hoàn thành' : s.status === 'upcoming' ? 'Sắp ra mắt' : 'Đang cập nhật'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium">
                    <span className="font-mono text-zinc-400">/{s.slug}</span>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      {s.total_items ?? (s.all_posts?.length || s.posts?.length || 0)} bài học
                    </span>
                    <span>•</span>
                    <span>{s.total_duration_minutes ? `${s.total_duration_minutes} phút` : 'Chưa có thời lượng'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fetchSeriesDetail(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteSeries(s.id, s.title, e)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                  title="Xóa Series"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Thanh Điều Hướng Phân Trang */}
        <PaginationControl
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredSeries.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="series"
          itemLabelEn="series"
        />
      </div>

      {/* POPUP MODAL FOR CREATE / EDIT SERIES */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {editingSeriesId ? 'Chỉnh Sửa Series' : 'Tạo Series Mới'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {editingSeriesId ? `Đang chỉnh sửa Series: ${seriesForm.title || editingSeriesId}` : 'Nhập thông tin chuỗi bài và xây dựng lộ trình học'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Header Tabs */}
            <div className="flex items-center gap-4 px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setActiveFormTab('info')}
                className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  activeFormTab === 'info'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Thông tin Series</span>
              </button>

              {editingSeriesId && (
                <button
                  type="button"
                  onClick={() => setActiveFormTab('curriculum')}
                  className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeFormTab === 'curriculum'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Lộ trình học ({currentItems.length})</span>
                </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-6">
              {/* TAB 1: FORM THÔNG TIN SERIES */}
              {activeFormTab === 'info' && (
                <form onSubmit={handleSaveSeries} className="space-y-4">
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
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {editingSeriesId && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Đổi slug có thể làm hỏng các liên kết bài viết cũ.</span>
                      </p>
                    )}
                  </div>

                  {/* Level & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Mức độ
                      </label>
                      <div className="relative">
                        <select
                          value={seriesForm.level}
                          onChange={(e) => setSeriesForm({ ...seriesForm, level: e.target.value })}
                          className="w-full appearance-none text-xs p-2.5 pr-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
                          className="w-full appearance-none text-xs p-2.5 pr-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="updating">Đang cập nhật</option>
                          <option value="completed">Đã hoàn thành</option>
                          <option value="upcoming">Sắp ra mắt</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Public switch */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                        Hiển thị công khai
                      </span>
                      <span className="text-[11px] text-zinc-500 block mt-0.5">
                        {seriesForm.is_published ? 'Hiển thị cho độc giả xem trên trang Series' : 'Tạm ẩn Series khỏi trang công khai'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSeriesForm({ ...seriesForm, is_published: !seriesForm.is_published })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                      placeholder="Chuỗi bài viết hướng dẫn..."
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Cover image (compact 16:9) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Ảnh bìa Series (16:9)
                      </label>
                      {seriesForm.cover_image && (
                        <label className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">
                          Đổi ảnh
                          <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                        </label>
                      )}
                    </div>

                    {seriesForm.cover_image ? (
                      <div className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video max-h-48 bg-zinc-100 dark:bg-zinc-800 shadow-sm">
                        <img src={seriesForm.cover_image} alt="Cover" className="w-full h-full object-cover" />
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
                      <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition">
                        <Upload className="w-5 h-5 text-zinc-400" />
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {isUploading ? 'Đang tải lên...' : 'Chọn hoặc kéo thả ảnh bìa'}
                        </span>
                        <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" disabled={isUploading} />
                      </label>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      {isSaving ? 'Đang lưu...' : editingSeriesId ? 'Lưu Thông Tin Series' : 'Tạo Series Mới'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: QUẢN LÝ LỘ TRÌNH (POSTS + VIDEOS + DỰ KIẾN) */}
              {editingSeriesId && activeFormTab === 'curriculum' && (
                <div className="space-y-6">
                  {/* Box Thêm bài học mới */}
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Thêm mục vào lộ trình</span>
                      </span>

                      {/* Switcher: Bài viết | Video | Dự kiến */}
                      <div className="inline-flex rounded-lg p-0.5 bg-zinc-200 dark:bg-zinc-700/60 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setItemTypeTab('post')}
                          className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                            itemTypeTab === 'post'
                              ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>Bài viết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemTypeTab('video')}
                          className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                            itemTypeTab === 'video'
                              ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                          }`}
                        >
                          <VideoIcon className="w-3 h-3" />
                          <span>Video</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemTypeTab('placeholder')}
                          className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                            itemTypeTab === 'placeholder'
                              ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>Dự kiến</span>
                        </button>
                      </div>
                    </div>

                    {/* Tùy chọn Tên phần / Section Header */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Thuộc phần (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={sectionTitleInput}
                        onChange={(e) => setSectionTitleInput(e.target.value)}
                        placeholder="VD: Phần 1: Nền tảng & Cấu trúc cơ bản"
                        className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Form theo Loại mục */}
                    {itemTypeTab === 'post' && (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={itemSearchQuery}
                            onChange={(e) => setItemSearchQuery(e.target.value)}
                            placeholder="Lọc bài viết chưa gán..."
                            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <select
                          value={selectedPostId}
                          onChange={(e) => setSelectedPostId(e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Chọn bài viết ({filteredAvailablePosts.length} khả dụng) --</option>
                          {filteredAvailablePosts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.title} ({p.reading_time || 5} min)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {itemTypeTab === 'video' && (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={itemSearchQuery}
                            onChange={(e) => setItemSearchQuery(e.target.value)}
                            placeholder="Lọc video chưa gán..."
                            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <select
                          value={selectedVideoId}
                          onChange={(e) => setSelectedVideoId(e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Chọn Video ({filteredAvailableVideos.length} khả dụng) --</option>
                          {filteredAvailableVideos.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.title} ({v.duration || 'N/A'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {itemTypeTab === 'placeholder' && (
                      <div className="space-y-2">
                        <div>
                          <input
                            type="text"
                            value={placeholderData.title}
                            onChange={(e) => setPlaceholderData({ ...placeholderData, title: e.target.value })}
                            placeholder="Tiêu đề bài học dự kiến *"
                            className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={placeholderData.duration}
                            onChange={(e) => setPlaceholderData({ ...placeholderData, duration: e.target.value })}
                            placeholder="Thời lượng (VD: 15 phút)"
                            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={placeholderData.note}
                            onChange={(e) => setPlaceholderData({ ...placeholderData, note: e.target.value })}
                            placeholder="Ghi chú (VD: Sắp ra mắt)"
                            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isSubmittingItem}
                      onClick={handleAddItem}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      {isSubmittingItem ? 'Đang thêm...' : '+ Thêm mục vào lộ trình'}
                    </button>
                  </div>

                  {/* Danh sách các bài học hiện tại trong Series */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Nội dung lộ trình ({currentItems.length} mục)
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Dùng nút mũi tên để đổi thứ tự
                      </span>
                    </div>

                    {currentItems.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <BookOpen className="w-8 h-8 mx-auto text-zinc-400 stroke-1 mb-1" />
                        <p className="text-xs text-zinc-500">Chưa có bài học nào trong lộ trình này.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {currentItems.map((item, idx, arr) => {
                          const isPost = item.item_type === 'post';
                          const isVideo = item.item_type === 'video';
                          const isPlaceholder = item.item_type === 'placeholder';

                          return (
                            <div
                              key={item.id || idx}
                              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {/* Up / Down Controls */}
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveItem(idx, -1)}
                                    className="p-0.5 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                                    title="Di chuyển lên trên"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === arr.length - 1}
                                    onClick={() => handleMoveItem(idx, 1)}
                                    className="p-0.5 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                                    title="Di chuyển xuống dưới"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Số thứ tự bước */}
                                <span className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>

                                {/* Icon Type */}
                                <span className={`p-1.5 rounded-lg shrink-0 ${
                                  isPost
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : isVideo
                                    ? 'bg-rose-500/10 text-rose-500'
                                    : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {isPost && <FileText className="w-3.5 h-3.5" />}
                                  {isVideo && <VideoIcon className="w-3.5 h-3.5" />}
                                  {isPlaceholder && <Lock className="w-3.5 h-3.5" />}
                                </span>

                                {/* Nội dung item */}
                                <div className="min-w-0 flex-1">
                                  {item.section_title && (
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase truncate">
                                      {item.section_title}
                                    </span>
                                  )}
                                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                    <span className="capitalize">{item.item_type}</span> • {item.duration || 'N/A'}
                                    {item.note && ` • ${item.note}`}
                                  </p>
                                </div>
                              </div>

                              {/* Nút Gỡ khỏi series */}
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id, item.title)}
                                className="px-2 py-1 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[11px] font-semibold transition shrink-0"
                                title="Gỡ khỏi chuỗi bài học"
                              >
                                Gỡ
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
