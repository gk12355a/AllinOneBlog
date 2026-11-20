import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Code,
  Briefcase,
  Plus,
  Trash2,
  Save,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  FoldVertical,
  UnfoldVertical,
  Upload,
  RefreshCw
} from 'lucide-react';
import { profileApi, mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

export default function ProfileTab({ initialProfile, onProfileUpdated }) {
  const { t } = useApp();

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    headline: '',
    bio: '',
    live_status: '',
    avatar_url: '',
    resume_url: '',
    skills: [],
    timeline: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Drag and Drop states for Timeline
  const [draggedTimelineIdx, setDraggedTimelineIdx] = useState(null);
  const [dragOverTimelineIdx, setDragOverTimelineIdx] = useState(null);
  const [collapsedTimeline, setCollapsedTimeline] = useState({});
  const [allTimelineCollapsed, setAllTimelineCollapsed] = useState(false);

  // Drag and Drop states for Skills
  const [draggedSkillIdx, setDraggedSkillIdx] = useState(null);
  const [dragOverSkillIdx, setDragOverSkillIdx] = useState(null);

  // Pointer-based Drag & Drop for Timeline (Supports mouse wheel scrolling during drag)
  const [pointerDragState, setPointerDragState] = useState(null); // { fromIndex, currentIndex, currentX, currentY, startX, startY, width, height }
  const dragCardsRef = React.useRef([]);

  const handlePointerDownDrag = (e, index) => {
    // Only primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Prevent if clicked directly on input or button
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(e.target.tagName)) return;

    e.preventDefault();
    const cardEl = dragCardsRef.current[index];
    const rect = cardEl ? cardEl.getBoundingClientRect() : null;

    setPointerDragState({
      fromIndex: index,
      currentIndex: index,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX: rect ? e.clientX - rect.left : 40,
      offsetY: rect ? e.clientY - rect.top : 20,
      width: rect ? rect.width : 500
    });

    const updateTargetCard = (clientY) => {
      let targetIdx = null;
      for (let i = 0; i < dragCardsRef.current.length; i++) {
        const el = dragCardsRef.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (clientY >= r.top && clientY <= r.bottom) {
          targetIdx = i;
          break;
        }
      }
      if (targetIdx !== null) {
        setPointerDragState((prev) => (prev ? { ...prev, currentIndex: targetIdx } : null));
      }
    };

    let lastClientX = e.clientX;
    let lastClientY = e.clientY;

    const handlePointerMove = (moveEvent) => {
      lastClientX = moveEvent.clientX;
      lastClientY = moveEvent.clientY;

      setPointerDragState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentX: lastClientX,
          currentY: lastClientY
        };
      });

      updateTargetCard(lastClientY);
    };

    const handleWheelDuringPointerDrag = (wheelEvent) => {
      // Allow wheel to scroll the document naturally
      window.scrollBy({ top: wheelEvent.deltaY, behavior: 'auto' });
      // Re-evaluate which card is under the cursor after scroll
      setTimeout(() => {
        updateTargetCard(lastClientY);
      }, 16);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('wheel', handleWheelDuringPointerDrag);

      setPointerDragState((prev) => {
        if (prev && prev.fromIndex !== null && prev.currentIndex !== null && prev.fromIndex !== prev.currentIndex) {
          moveTimelineItem(prev.fromIndex, prev.currentIndex);
        }
        return null;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('wheel', handleWheelDuringPointerDrag, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  useEffect(() => {
    if (initialProfile) {
      setProfileForm({
        full_name: initialProfile.full_name || '',
        headline: initialProfile.headline || '',
        bio: initialProfile.bio || '',
        live_status: initialProfile.live_status || '',
        avatar_url: initialProfile.avatar_url || '',
        resume_url: initialProfile.resume_url || '',
        skills: initialProfile.skills ? JSON.parse(JSON.stringify(initialProfile.skills)) : [],
        timeline: initialProfile.timeline ? JSON.parse(JSON.stringify(initialProfile.timeline)) : []
      });
    }
  }, [initialProfile]);

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng ảnh tối đa là 5MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await mediaApi.uploadUserImage(formData);
      const dataObj = res?.data?.data || res?.data || res;
      const uploadedUrl = dataObj?.file_url || dataObj?.url;

      if (uploadedUrl) {
        setProfileForm(prev => ({ ...prev, avatar_url: uploadedUrl }));
        alert('Tải ảnh đại diện lên thành công! Hãy bấm "Lưu Thay Đổi Hồ Sơ" để áp dụng ra Trang chủ.');
      } else {
        throw new Error(res?.message || 'Tải ảnh thất bại');
      }
    } catch (err) {
      alert(err?.message || err?.response?.data?.message || 'Lỗi khi tải ảnh');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await profileApi.updateProfile(profileForm);
      const data = res?.data || res;
      if (onProfileUpdated) onProfileUpdated(data);
      alert(t('admin.profile_update_success'));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setIsSaving(false);
    }
  };

  // Skill Handlers
  const addSkillCategory = () => {
    setProfileForm({
      ...profileForm,
      skills: [...profileForm.skills, { category: 'New Category', items: ['Skill 1'] }]
    });
  };

  const removeSkillCategory = (idx) => {
    setProfileForm({
      ...profileForm,
      skills: profileForm.skills.filter((_, i) => i !== idx)
    });
  };

  const updateSkillCategory = (idx, field, val) => {
    const updated = [...profileForm.skills];
    if (field === 'items') {
      updated[idx].items = typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : val;
    } else {
      updated[idx][field] = val;
    }
    setProfileForm({ ...profileForm, skills: updated });
  };

  const moveSkillCategory = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= profileForm.skills.length) return;
    const updated = [...profileForm.skills];
    const [item] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, item);
    setProfileForm({ ...profileForm, skills: updated });
  };

  const handleSkillDragStart = (e, index) => {
    setDraggedSkillIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSkillDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSkillIdx !== index) {
      setDragOverSkillIdx(index);
    }
  };

  const handleSkillDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedSkillIdx === null || draggedSkillIdx === dropIndex) {
      setDraggedSkillIdx(null);
      setDragOverSkillIdx(null);
      return;
    }
    moveSkillCategory(draggedSkillIdx, dropIndex);
    setDraggedSkillIdx(null);
    setDragOverSkillIdx(null);
  };

  const handleSkillDragEnd = () => {
    setDraggedSkillIdx(null);
    setDragOverSkillIdx(null);
  };

  // Timeline Handlers
  const addTimelineItem = () => {
    setProfileForm({
      ...profileForm,
      timeline: [
        { year: '2026', title: 'Vị trí công việc', company: 'Công ty', description: 'Mô tả chi tiết...' },
        ...profileForm.timeline
      ]
    });
  };

  const removeTimelineItem = (idx) => {
    setProfileForm({
      ...profileForm,
      timeline: profileForm.timeline.filter((_, i) => i !== idx)
    });
  };

  const updateTimelineItem = (idx, field, val) => {
    const updated = [...profileForm.timeline];
    updated[idx][field] = val;
    setProfileForm({ ...profileForm, timeline: updated });
  };

  const moveTimelineItem = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= profileForm.timeline.length) return;
    const updated = [...profileForm.timeline];
    const [item] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, item);
    setProfileForm({ ...profileForm, timeline: updated });
  };

  const toggleTimelineCollapse = (idx) => {
    setCollapsedTimeline((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const toggleAllTimelineCollapse = () => {
    const nextState = !allTimelineCollapsed;
    setAllTimelineCollapsed(nextState);
    const updated = {};
    profileForm.timeline.forEach((_, idx) => {
      updated[idx] = nextState;
    });
    setCollapsedTimeline(updated);
  };

  const handleTimelineDragStart = (e, index) => {
    setDraggedTimelineIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTimelineDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTimelineIdx !== index) {
      setDragOverTimelineIdx(index);
    }

    // Tự động cuộn trang khi kéo sát mép màn hình (Auto-scroll on drag)
    const scrollZone = 140;
    const clientY = e.clientY;
    if (clientY < scrollZone) {
      const intensity = Math.max(8, Math.round((scrollZone - clientY) / 3));
      window.scrollBy({ top: -intensity, behavior: 'auto' });
    } else if (clientY > window.innerHeight - scrollZone) {
      const intensity = Math.max(8, Math.round((clientY - (window.innerHeight - scrollZone)) / 3));
      window.scrollBy({ top: intensity, behavior: 'auto' });
    }
  };

  const handleTimelineDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedTimelineIdx === null || draggedTimelineIdx === dropIndex) {
      setDraggedTimelineIdx(null);
      setDragOverTimelineIdx(null);
      return;
    }
    moveTimelineItem(draggedTimelineIdx, dropIndex);
    setDraggedTimelineIdx(null);
    setDragOverTimelineIdx(null);
  };

  const handleTimelineDragEnd = () => {
    setDraggedTimelineIdx(null);
    setDragOverTimelineIdx(null);
  };

  return (
    <form onSubmit={handleSaveProfile} className="space-y-8 animate-fade-in">
      {/* 1. Basic Info */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {t('admin.profile_info_title')}
            </h2>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? t('admin.saving') : t('admin.save_profile_btn')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {t('admin.full_name')}
            </label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              placeholder="Đỗ Trí Kiên"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {t('admin.live_status_label')}
            </label>
            <input
              type="text"
              value={profileForm.live_status}
              onChange={(e) => setProfileForm({ ...profileForm, live_status: e.target.value })}
              placeholder="🟢 Available for new projects"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {t('admin.headline_label')}
            </label>
            <input
              type="text"
              value={profileForm.headline}
              onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
              placeholder="DevOps Engineer | Cloud & Infrastructure Specialist"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {t('admin.bio_label')}
            </label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              placeholder="Là một kỹ sư DevOps, tôi đam mê..."
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {t('admin.avatar_url')}
              </label>
              <label className="cursor-pointer text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingAvatar ? 'Đang tải lên...' : 'Tải ảnh mới từ máy'}</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleUploadAvatar}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              {profileForm.avatar_url && (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shrink-0">
                  <img src={profileForm.avatar_url} alt="Avatar Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <input
                type="text"
                value={profileForm.avatar_url}
                onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                placeholder="https://..."
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {t('admin.resume_url')}
            </label>
            <input
              type="text"
              value={profileForm.resume_url}
              onChange={(e) => setProfileForm({ ...profileForm, resume_url: e.target.value })}
              placeholder="https://.../cv.pdf"
              className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* 2. Technical Skills */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {t('admin.skills_section')}
            </h2>
          </div>
          <button
            type="button"
            onClick={addSkillCategory}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
          >
            <Plus className="w-3.5 h-3.5" /> {t('admin.add_skill_group')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profileForm.skills.map((skillGroup, sIdx) => {
            const isDragging = draggedSkillIdx === sIdx;
            const isDragOver = dragOverSkillIdx === sIdx;

            return (
              <div
                key={sIdx}
                draggable
                onDragStart={(e) => handleSkillDragStart(e, sIdx)}
                onDragOver={(e) => handleSkillDragOver(e, sIdx)}
                onDrop={(e) => handleSkillDrop(e, sIdx)}
                onDragEnd={handleSkillDragEnd}
                className={`p-4 rounded-xl border transition-all duration-150 space-y-3 relative group ${isDragging
                    ? 'opacity-40 scale-[0.98] border-dashed border-blue-400 dark:border-blue-500 bg-blue-50/10'
                    : isDragOver
                      ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
              >
                {/* Top bar with drag handle and actions */}
                <div className="flex items-center justify-between pb-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition select-none">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      #{sIdx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => moveSkillCategory(sIdx, sIdx - 1)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition"
                      title={t('admin.move_up')}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === profileForm.skills.length - 1}
                      onClick={() => moveSkillCategory(sIdx, sIdx + 1)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition"
                      title={t('admin.move_down')}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSkillCategory(sIdx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition ml-1"
                      title={t('admin.delete_skill_tip')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    {t('admin.category_name')}
                  </label>
                  <input
                    type="text"
                    value={skillGroup.category}
                    onChange={(e) => updateSkillCategory(sIdx, 'category', e.target.value)}
                    placeholder="Container & Orchestration"
                    className="w-full text-xs font-bold p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    {t('admin.skills_list')}
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(skillGroup.items) ? skillGroup.items.join(', ') : skillGroup.items}
                    onChange={(e) => updateSkillCategory(sIdx, 'items', e.target.value)}
                    placeholder="Kubernetes (CKA), Docker, Proxmox..."
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Work Experience Timeline with Drag & Drop */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {t('admin.timeline_section')}
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {t('admin.timeline_hint')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleAllTimelineCollapse}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title={allTimelineCollapsed ? t('admin.expand_all') : t('admin.collapse_all')}
            >
              {allTimelineCollapsed ? <UnfoldVertical className="w-3.5 h-3.5" /> : <FoldVertical className="w-3.5 h-3.5" />}
              <span>{allTimelineCollapsed ? t('admin.expand_all') : t('admin.collapse_all')}</span>
            </button>
            <button
              type="button"
              onClick={addTimelineItem}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> {t('admin.add_timeline_btn')}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {profileForm.timeline.map((item, tIdx) => {
            const isPointerActive = pointerDragState !== null;
            const isDragging = isPointerActive
              ? pointerDragState.fromIndex === tIdx
              : draggedTimelineIdx === tIdx;
            const isDragOver = isPointerActive
              ? pointerDragState.currentIndex === tIdx && pointerDragState.fromIndex !== tIdx
              : dragOverTimelineIdx === tIdx;
            const isCollapsed = !!collapsedTimeline[tIdx];

            return (
              <div
                key={tIdx}
                ref={(el) => (dragCardsRef.current[tIdx] = el)}
                draggable
                onDragStart={(e) => handleTimelineDragStart(e, tIdx)}
                onDragOver={(e) => handleTimelineDragOver(e, tIdx)}
                onDrop={(e) => handleTimelineDrop(e, tIdx)}
                onDragEnd={handleTimelineDragEnd}
                className={`p-3.5 rounded-xl border transition-all duration-150 space-y-3 relative group select-none ${isDragging
                    ? 'opacity-40 scale-[0.98] border-dashed border-emerald-400 dark:border-emerald-500 bg-emerald-50/10 shadow-inner'
                    : isDragOver
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
              >
                {/* Header bar of Card: Drag Handle + Position Badge + Quick Reorder Buttons + Delete */}
                <div
                  onPointerDown={(e) => handlePointerDownDrag(e, tIdx)}
                  className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 cursor-grab active:cursor-grabbing touch-none"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <div
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition select-none shrink-0"
                      title={t('admin.drag_card_hint')}
                    >
                      <GripVertical className="w-4 h-4" />
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {t('admin.pos_badge')} #{tIdx + 1}
                      </span>
                    </div>

                    {isCollapsed ? (
                      <div
                        onClick={() => toggleTimelineCollapse(tIdx)}
                        className="flex items-center gap-2 text-xs truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        <span className="font-mono font-semibold text-zinc-500 shrink-0">{item.year || 'N/A'}</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.title || '(Chưa có chức danh)'}</span>
                        {item.company && <span className="text-zinc-400 truncate hidden sm:inline">@{item.company}</span>}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-400 hidden sm:inline italic">
                        {t('admin.drag_card_hint')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={tIdx === 0}
                      onClick={() => moveTimelineItem(tIdx, 0)}
                      className="p-1 rounded text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-20 transition"
                      title={t('admin.move_to_top')}
                    >
                      <ChevronsUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={tIdx === 0}
                      onClick={() => moveTimelineItem(tIdx, tIdx - 1)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition"
                      title={t('admin.move_up')}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={tIdx === profileForm.timeline.length - 1}
                      onClick={() => moveTimelineItem(tIdx, tIdx + 1)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition"
                      title={t('admin.move_down')}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={tIdx === profileForm.timeline.length - 1}
                      onClick={() => moveTimelineItem(tIdx, profileForm.timeline.length - 1)}
                      className="p-1 rounded text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-20 transition"
                      title={t('admin.move_to_bottom')}
                    >
                      <ChevronsDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTimelineCollapse(tIdx)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                      title={t('admin.toggle_expand')}
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTimelineItem(tIdx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition ml-1"
                      title={t('admin.delete_timeline_tip')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          {t('admin.period_time')}
                        </label>
                        <input
                          type="text"
                          value={item.year}
                          onChange={(e) => updateTimelineItem(tIdx, 'year', e.target.value)}
                          placeholder="09/2025 - 12/2025"
                          className="w-full text-xs font-mono p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          {t('admin.job_title')}
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateTimelineItem(tIdx, 'title', e.target.value)}
                          placeholder="Thực tập sinh lập trình viên"
                          className="w-full text-xs font-bold p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          {t('admin.company_org')}
                        </label>
                        <input
                          type="text"
                          value={item.company}
                          onChange={(e) => updateTimelineItem(tIdx, 'company', e.target.value)}
                          placeholder="CMC Global"
                          className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        {t('admin.desc_achievements')}
                      </label>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => updateTimelineItem(tIdx, 'description', e.target.value)}
                        placeholder="Phát triển backend Java Spring Boot, RESTful APIs..."
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating ghost shadow preview card following the pointer */}
        {pointerDragState && profileForm.timeline[pointerDragState.fromIndex] && (
          <div
            style={{
              position: 'fixed',
              left: `${pointerDragState.currentX - pointerDragState.offsetX}px`,
              top: `${pointerDragState.currentY - pointerDragState.offsetY}px`,
              width: `${pointerDragState.width}px`,
              pointerEvents: 'none',
              zIndex: 9999
            }}
            className="p-3.5 rounded-xl border border-emerald-500 bg-white/95 dark:bg-zinc-900/95 shadow-2xl opacity-90 scale-[1.02] backdrop-blur-md transition-transform duration-75 ring-2 ring-emerald-500/40"
          >
            <div className="flex items-center gap-2 pb-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <GripVertical className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                {t('admin.pos_badge')} #{pointerDragState.currentIndex + 1}
              </span>
              <span className="text-xs font-mono font-semibold text-zinc-500">
                {profileForm.timeline[pointerDragState.fromIndex].year}
              </span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {profileForm.timeline[pointerDragState.fromIndex].title || '(Vị trí đang di chuyển)'}
              </span>
              {profileForm.timeline[pointerDragState.fromIndex].company && (
                <span className="text-xs text-zinc-400 truncate">
                  @{profileForm.timeline[pointerDragState.fromIndex].company}
                </span>
              )}
            </div>
            {profileForm.timeline[pointerDragState.fromIndex].description && (
              <p className="text-[11px] text-zinc-500 line-clamp-1 mt-1.5 italic">
                {profileForm.timeline[pointerDragState.fromIndex].description}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? t('admin.saving') : t('admin.save_home_profile_btn')}
        </button>
      </div>
    </form>
  );
}
