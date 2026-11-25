import React, { useState } from 'react';
import {
  Award,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Upload,
  X,
  Search,
  Loader2,
  Calendar,
  Hash,
  FileText
} from 'lucide-react';
import { contentApi, mediaApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';
import PaginationControl from './PaginationControl';

export default function CertificatesTab({ certificates = [], onCertificatesUpdated }) {
  const { lang, showToast } = useApp();

  const emptyForm = {
    title: '',
    issuer: '',
    issue_date: '',
    credential_id: '',
    credential_url: '',
    image_url: '',
    pdf_url: '',
    description: '',
    skills: '',
    sort_order: 1
  };

  const [certForm, setCertForm] = useState(emptyForm);
  const [editingCertId, setEditingCertId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const openCreateModal = () => {
    setEditingCertId(null);
    setCertForm({ ...emptyForm, sort_order: certificates.length + 1 });
    setIsModalOpen(true);
  };

  const openEditModal = (cert) => {
    setEditingCertId(cert.id);
    setCertForm({
      title: cert.title || '',
      issuer: cert.issuer || '',
      issue_date: cert.issue_date || '',
      credential_id: cert.credential_id || '',
      credential_url: cert.credential_url || '',
      image_url: cert.image_url || '',
      pdf_url: cert.pdf_url || '',
      description: cert.description || '',
      skills: Array.isArray(cert.skills) ? cert.skills.join(', ') : (cert.skills || ''),
      sort_order: cert.sort_order ?? 0
    });
    setIsModalOpen(true);
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
        setCertForm((prev) => ({ ...prev, image_url: uploadedUrl }));
        showToast(lang === 'vi' ? 'Tải ảnh chứng chỉ thành công!' : 'Certificate image uploaded!');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi tải ảnh lên', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!certForm.title.trim() || !certForm.issuer.trim()) {
      showToast(lang === 'vi' ? 'Vui lòng nhập tên chứng chỉ và tổ chức cấp!' : 'Title and issuer are required!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...certForm,
        sort_order: Number(certForm.sort_order) || 0
      };

      if (editingCertId) {
        await contentApi.updateCertificate(editingCertId, payload);
        showToast(lang === 'vi' ? 'Cập nhật chứng chỉ thành công!' : 'Certificate updated!');
      } else {
        await contentApi.createCertificate(payload);
        showToast(lang === 'vi' ? 'Thêm chứng chỉ mới thành công!' : 'Certificate created!');
      }

      setIsModalOpen(false);
      onCertificatesUpdated?.();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lưu chứng chỉ thất bại', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cert) => {
    const confirmMsg = lang === 'vi'
      ? `Bạn có chắc chắn muốn xóa chứng chỉ "${cert.title}"?`
      : `Are you sure you want to delete "${cert.title}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await contentApi.deleteCertificate(cert.id);
      showToast(lang === 'vi' ? 'Đã xóa chứng chỉ!' : 'Certificate deleted!');
      onCertificatesUpdated?.();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Xóa thất bại', 'error');
    }
  };

  const filteredCertificates = certificates.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const skillsStr = Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || '');
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.issuer || '').toLowerCase().includes(q) ||
      (c.credential_id || '').toLowerCase().includes(q) ||
      skillsStr.toLowerCase().includes(q)
    );
  });

  const totalItems = filteredCertificates.length;
  const paginatedCertificates = filteredCertificates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={lang === 'vi' ? 'Tìm chứng chỉ, tổ chức cấp, mã...' : 'Search certificates, issuer, ID...'}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Thêm chứng chỉ' : 'Add Certificate'}</span>
        </button>
      </div>

      {/* Certificates List */}
      {filteredCertificates.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
          <Award className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">
            {searchFilter
              ? (lang === 'vi' ? 'Không tìm thấy chứng chỉ nào khớp.' : 'No matching certificates found.')
              : (lang === 'vi' ? 'Chưa có chứng chỉ nào. Hãy thêm chứng chỉ đầu tiên!' : 'No certificates yet.')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50/70 dark:bg-zinc-900/80">
                  <th className="py-3.5 px-4">{lang === 'vi' ? 'Chứng chỉ' : 'Certificate'}</th>
                  <th className="py-3.5 px-4">{lang === 'vi' ? 'Tổ chức cấp' : 'Issuer'}</th>
                  <th className="py-3.5 px-4">{lang === 'vi' ? 'Ngày cấp / Mã' : 'Date / ID'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'vi' ? 'Thứ tự' : 'Order'}</th>
                  <th className="py-3.5 px-4 text-right">{lang === 'vi' ? 'Hành động' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                {paginatedCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0 flex items-center justify-center">
                          {cert.image_url ? (
                            <img src={cert.image_url} alt={cert.title} className="w-full h-full object-cover" />
                          ) : (
                            <Award className="w-6 h-6 text-indigo-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
                            {cert.title}
                          </div>
                          {cert.skills && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(Array.isArray(cert.skills) ? cert.skills : cert.skills.split(','))
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .slice(0, 3)
                                .map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60"
                                  >
                                    {skill}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                      {cert.issuer}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-500 space-y-1">
                      {cert.issue_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{cert.issue_date}</span>
                        </div>
                      )}
                      {cert.credential_id && (
                        <div className="flex items-center gap-1 font-mono">
                          <Hash className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[140px]">{cert.credential_id}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-zinc-500">
                      {cert.sort_order ?? 0}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                            title={lang === 'vi' ? 'Xem link xác thực' : 'Verify Credential'}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => openEditModal(cert)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                          title={lang === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cert)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title={lang === 'vi' ? 'Xóa' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <PaginationControl
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <span>
                  {editingCertId
                    ? (lang === 'vi' ? 'Cập nhật chứng chỉ' : 'Edit Certificate')
                    : (lang === 'vi' ? 'Thêm chứng chỉ mới' : 'Add New Certificate')}
                </span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {lang === 'vi' ? 'Tên chứng chỉ *' : 'Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={certForm.title}
                    onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                    placeholder="e.g. Certified Kubernetes Administrator (CKA)"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {lang === 'vi' ? 'Tổ chức cấp *' : 'Issuer *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={certForm.issuer}
                    onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })}
                    placeholder="e.g. Cloud Native Computing Foundation"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {lang === 'vi' ? 'Ngày cấp' : 'Issue Date'}
                  </label>
                  <input
                    type="text"
                    value={certForm.issue_date}
                    onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                    placeholder="e.g. 10/2026"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {lang === 'vi' ? 'Mã chứng chỉ (ID)' : 'Credential ID'}
                  </label>
                  <input
                    type="text"
                    value={certForm.credential_id}
                    onChange={(e) => setCertForm({ ...certForm, credential_id: e.target.value })}
                    placeholder="LF-123456"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    {lang === 'vi' ? 'Thứ tự hiển thị' : 'Sort Order'}
                  </label>
                  <input
                    type="number"
                    value={certForm.sort_order}
                    onChange={(e) => setCertForm({ ...certForm, sort_order: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Link xác thực (Credential URL)' : 'Credential URL'}
                </label>
                <input
                  type="url"
                  value={certForm.credential_url}
                  onChange={(e) => setCertForm({ ...certForm, credential_url: e.target.value })}
                  placeholder="https://www.credly.com/badges/..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Ảnh chứng chỉ (URL hoặc tải lên)' : 'Certificate Image'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={certForm.image_url}
                    onChange={(e) => setCertForm({ ...certForm, image_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer transition shrink-0">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{lang === 'vi' ? 'Tải ảnh' : 'Upload'}</span>
                    <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" disabled={isUploading} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Link PDF (Tùy chọn)' : 'PDF URL (Optional)'}
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={certForm.pdf_url}
                    onChange={(e) => setCertForm({ ...certForm, pdf_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Kỹ năng liên quan (cách nhau bằng dấu phẩy)' : 'Skills (comma separated)'}
                </label>
                <input
                  type="text"
                  value={certForm.skills}
                  onChange={(e) => setCertForm({ ...certForm, skills: e.target.value })}
                  placeholder="Kubernetes, Docker, Linux, Security"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Mô tả ngắn' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={certForm.description}
                  onChange={(e) => setCertForm({ ...certForm, description: e.target.value })}
                  placeholder={lang === 'vi' ? 'Mô tả chi tiết về chứng chỉ...' : 'Certificate details...'}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingCertId ? (lang === 'vi' ? 'Lưu thay đổi' : 'Save Changes') : (lang === 'vi' ? 'Tạo chứng chỉ' : 'Create')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
