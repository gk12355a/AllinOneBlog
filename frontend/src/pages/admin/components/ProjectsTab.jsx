import React, { useState } from 'react';
import {
  Edit3,
  Trash2,
  FolderGit2,
  Plus,
  Star,
  ExternalLink,
  Upload,
  X,
  Search,
  Check,
  Sparkles,
  Layers,
  Loader2
} from 'lucide-react';
import { GithubIcon } from '../../../components/SocialIcons';
import { contentApi, mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';

export default function ProjectsTab({ projects = [], onProjectsUpdated }) {
  const { t, showToast } = useApp();

  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    tech_stack: '',
    demo_link: '',
    github_link: '',
    show_demo: true,
    show_github: true,
    image_url: '',
    is_featured: true,
    sort_order: 1
  });
  const [techInput, setTechInput] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Common quick tech suggestions
  const suggestedTechs = ['React', 'TypeScript', 'TailwindCSS', 'Python', 'Flask', 'Docker', 'Kubernetes', 'PostgreSQL', 'Redis'];

  // Parse comma-separated tech stack string into array of chips
  const techChips = React.useMemo(() => {
    if (!projectForm.tech_stack) return [];
    if (Array.isArray(projectForm.tech_stack)) return projectForm.tech_stack;
    return projectForm.tech_stack
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [projectForm.tech_stack]);

  const addTechChip = (techName) => {
    const clean = techName.trim();
    if (!clean || techChips.includes(clean)) return;
    const nextList = [...techChips, clean];
    setProjectForm({ ...projectForm, tech_stack: nextList.join(', ') });
    setTechInput('');
  };

  const removeTechChip = (chipToRemove) => {
    const nextList = techChips.filter((c) => c !== chipToRemove);
    setProjectForm({ ...projectForm, tech_stack: nextList.join(', ') });
  };

  const handleTechKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTechChip(techInput);
    }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('apply_watermark', 'false');

    setIsUploading(true);
    try {
      const res = await mediaApi.upload(formData);
      const data = res?.data || res;
      const uploadedUrl = data?.file?.watermarked_url || data?.file?.url || data?.url;
      if (uploadedUrl) {
        setProjectForm((prev) => ({ ...prev, image_url: uploadedUrl }));
        showToast('Tải ảnh minh họa thành công!');
      }
    } catch (err) {
      alert(err.message || 'Lỗi tải ảnh lên');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...projectForm,
        sort_order: Number(projectForm.sort_order) || 0
      };
      if (editingProjectId) {
        await contentApi.updateProject(editingProjectId, payload);
        showToast('Cập nhật dự án thành công!');
      } else {
        await contentApi.createProject(payload);
        showToast('Thêm dự án mới thành công!');
      }
      setIsModalOpen(false);
      setEditingProjectId(null);
      if (onProjectsUpdated) onProjectsUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi lưu dự án');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id, title, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dự án "${title}"?`)) return;
    try {
      await contentApi.deleteProject(id);
      showToast('Đã xóa dự án thành công!');
      if (editingProjectId === id) {
        setIsModalOpen(false);
      }
      if (onProjectsUpdated) onProjectsUpdated();
    } catch (err) {
      alert('Lỗi xóa dự án');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProjectId(null);
    setProjectForm({
      title: '',
      description: '',
      tech_stack: '',
      demo_link: '',
      github_link: '',
      show_demo: true,
      show_github: true,
      image_url: '',
      is_featured: true,
      sort_order: 1
    });
    setTechInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proj) => {
    setEditingProjectId(proj.id);
    const techStackStr = Array.isArray(proj.tech_stack)
      ? proj.tech_stack.join(', ')
      : proj.tech_stack || '';

    setProjectForm({
      title: proj.title || '',
      description: proj.description || '',
      tech_stack: techStackStr,
      demo_link: proj.demo_link || '',
      github_link: proj.github_link || '',
      show_demo: proj.show_demo !== undefined ? !!proj.show_demo : true,
      show_github: proj.show_github !== undefined ? !!proj.show_github : true,
      image_url: proj.image_url || '',
      is_featured: !!proj.is_featured,
      sort_order: proj.sort_order || 1
    });
    setTechInput('');
    setIsModalOpen(true);
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const titleMatch = p.title?.toLowerCase().includes(q);
    const techStr = Array.isArray(p.tech_stack) ? p.tech_stack.join(' ') : (p.tech_stack || '');
    const techMatch = techStr.toLowerCase().includes(q);
    return titleMatch || techMatch;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('admin.projects_list_title')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
              {filteredProjects.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Nhấp trực tiếp vào dự án để mở popup xem thông tin và chỉnh sửa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm kiếm dự án, tech..."
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
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Dự Án</span>
          </button>
        </div>
      </div>

      {/* Full-Width Project Items List */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-2">
            <FolderGit2 className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 stroke-1" />
            <p className="text-sm font-medium">{t('admin.no_projects')}</p>
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const parsedTechs = Array.isArray(proj.tech_stack)
              ? proj.tech_stack
              : (proj.tech_stack || '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);

            return (
              <div
                key={proj.id}
                onClick={() => handleOpenEditModal(proj)}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Project Thumbnail Preview with Hover Zoom */}
                  {proj.image_url ? (
                    <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 group relative">
                      <img
                        src={proj.image_url}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-16 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                      <FolderGit2 className="w-7 h-7 stroke-1" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {proj.title}
                      </h3>
                      {proj.is_featured ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                          title="Dự án nổi bật trên trang chủ"
                        >
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{t('admin.featured_badge')}</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1 leading-relaxed">
                      {proj.description || 'Không có mô tả chi tiết.'}
                    </p>

                    {/* Tech Stack Chips */}
                    {parsedTechs.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {parsedTechs.map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] font-medium border border-zinc-200/60 dark:border-zinc-700/60"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                  {proj.demo_link && (
                    <a
                      href={proj.demo_link}
                      target="_blank"
                      rel="noreferrer"
                      className={`p-2 rounded-lg border transition ${
                        proj.show_demo
                          ? 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400'
                          : 'border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 opacity-60'
                      }`}
                      title={proj.show_demo ? "Demo (Đang hiển thị công khai)" : "Demo (Đang ẩn với người xem)"}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {proj.github_link && (
                    <a
                      href={proj.github_link}
                      target="_blank"
                      rel="noreferrer"
                      className={`p-2 rounded-lg border transition ${
                        proj.show_github
                          ? 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                          : 'border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 opacity-60'
                      }`}
                      title={proj.show_github ? "Source Code (Đang hiển thị công khai)" : "Source Code (Đang ẩn với người xem)"}
                    >
                      <GithubIcon className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleOpenEditModal(proj)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1"
                    title="Chỉnh sửa thông tin dự án"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteProject(proj.id, proj.title, e)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                    title="Xóa dự án"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* POPUP MODAL FOR CREATE / EDIT PROJECT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {editingProjectId ? t('admin.edit_project') : t('admin.create_project')}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {editingProjectId ? `Đang chỉnh sửa: ${projectForm.title || editingProjectId}` : 'Nhập thông tin dự án và công nghệ sử dụng'}
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

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProject} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('admin.project_name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="VD: Nền tảng Microservices Blog Cloud"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('admin.project_desc')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Mô tả mục tiêu, kiến trúc và kết quả đạt được của dự án..."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Tag Input for Tech Stack */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('admin.project_tech')} (Gõ tên rồi nhấn Enter)
                </label>

                {/* Chips Box */}
                <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {techChips.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-semibold border border-indigo-200 dark:border-indigo-900/60"
                      >
                        <span>{tech}</span>
                        <button
                          type="button"
                          onClick={() => removeTechChip(tech)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={handleTechKeyDown}
                      placeholder="Gõ tech rồi Enter (React, Docker...)"
                      className="text-xs bg-transparent outline-none flex-1 min-w-[140px] p-0.5 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                    <span className="text-[10px] text-zinc-400 mr-1 self-center">Gợi ý nhanh:</span>
                    {suggestedTechs.map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => addTechChip(tech)}
                        className="px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono hover:bg-indigo-50 hover:text-indigo-600 transition"
                      >
                        +{tech}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project Image Direct Upload or URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Ảnh minh họa dự án
                </label>

                {projectForm.image_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 group">
                    <img
                      src={projectForm.image_url}
                      alt="Project Preview"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/95 text-zinc-900 text-xs font-bold cursor-pointer shadow">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Đổi ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadImage}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setProjectForm({ ...projectForm, image_url: '' })}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-1" />
                    ) : (
                      <Upload className="w-6 h-6 text-zinc-400 group-hover:text-indigo-600 mb-1" />
                    )}
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {isUploading ? 'Đang tải ảnh...' : 'Tải ảnh minh họa lên từ máy tính'}
                    </span>
                    <span className="text-[11px] text-zinc-400">PNG, JPG, WEBP (Tự động tối ưu)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImage}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>

              {/* Links Section */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('admin.demo_link')}
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-500">
                        <input
                          type="checkbox"
                          checked={projectForm.show_demo}
                          onChange={(e) => setProjectForm({ ...projectForm, show_demo: e.target.checked })}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>{projectForm.show_demo ? 'Hiện công khai' : 'Ẩn'}</span>
                      </label>
                      {projectForm.demo_link && (
                        <a
                          href={projectForm.demo_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Mở thử</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <input
                    type="url"
                    value={projectForm.demo_link}
                    onChange={(e) => setProjectForm({ ...projectForm, demo_link: e.target.value })}
                    placeholder="https://my-demo-app.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('admin.source_link')}
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-500">
                        <input
                          type="checkbox"
                          checked={projectForm.show_github}
                          onChange={(e) => setProjectForm({ ...projectForm, show_github: e.target.checked })}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>{projectForm.show_github ? 'Hiện công khai' : 'Ẩn'}</span>
                      </label>
                      {projectForm.github_link && (
                        <a
                          href={projectForm.github_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Mở Github</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <input
                    type="url"
                    value={projectForm.github_link}
                    onChange={(e) => setProjectForm({ ...projectForm, github_link: e.target.value })}
                    placeholder="https://github.com/my-username/repo"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Toggle Switch: Featured on Home */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                    Hiển thị ở Trang Chủ
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    Xuất hiện trong mục "Dự Án Nổi Bật" cho độc giả xem
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectForm({ ...projectForm, is_featured: !projectForm.is_featured })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    projectForm.is_featured ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      projectForm.is_featured ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Action Buttons */}
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
                  disabled={isSaving || isUploading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isSaving ? 'Đang lưu...' : editingProjectId ? t('admin.btn_update_project') : t('admin.btn_create_project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
