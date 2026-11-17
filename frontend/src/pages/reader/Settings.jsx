import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  User, Lock, Palette, BookOpen, ShieldAlert, 
  Upload, Trash2, Globe, CheckCircle2, 
  AlertCircle, Eye, EyeOff, Save, Download, ChevronRight, Moon, Sun, Monitor
} from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '../../components/SocialIcons';
import { useApp } from '../../contexts/AppContext';
import authService from '../../services/authService';
import mediaService from '../../services/mediaService';
import userService from '../../services/userService';

const SECTIONS = [
  { id: 'profile', labelVi: 'Hồ sơ', labelEn: 'Profile', icon: User, descVi: 'Thông tin cá nhân, ảnh đại diện và liên kết mạng xã hội', descEn: 'Personal information, avatar, and social links' },
  { id: 'security', labelVi: 'Tài khoản & Bảo mật', labelEn: 'Account & Security', icon: Lock, descVi: 'Mật khẩu đăng nhập và thông tin phiên làm việc', descEn: 'Login credentials and active sessions' },
  { id: 'appearance', labelVi: 'Giao diện & Ngôn ngữ', labelEn: 'Appearance & Language', icon: Palette, descVi: 'Tùy chỉnh chủ đề sáng/tối, ngôn ngữ và cỡ chữ đọc bài', descEn: 'Theme preferences, language, and reading font size' },
  { id: 'reading', labelVi: 'Thư viện & Đọc', labelEn: 'Library & Reading', icon: BookOpen, descVi: 'Lịch sử đọc bài, xóa dữ liệu và tab mặc định', descEn: 'Reading history preferences and cleanup' },
  { id: 'privacy', labelVi: 'Quyền riêng tư & Vùng nguy hiểm', labelEn: 'Privacy & Danger Zone', icon: ShieldAlert, descVi: 'Tải về dữ liệu cá nhân hoặc xóa tài khoản vĩnh viễn', descEn: 'Export data bundle or permanently delete account' }
];

export default function Settings() {
  const { section: sectionParam } = useParams();
  const navigate = useNavigate();
  const { user, updateUserData, theme, setTheme, lang, changeLanguage, readingFontSize, setReadingFontSize, t } = useApp();

  // Active section state
  const activeSection = SECTIONS.some(s => s.id === sectionParam) ? sectionParam : 'profile';

  // Notification / Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    github_url: '',
    linkedin_url: '',
    avatar_url: ''
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Security Form state
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [pwdSaving, setPwdSaving] = useState(false);

  // Appearance / Settings Form state
  const [settingsForm, setSettingsForm] = useState({
    preferred_theme: 'dark',
    ui_language: 'vi',
    content_language: 'all',
    reading_font_size: 'medium',
    reduce_motion: false,
    record_reading_history: true,
    default_library_tab: 'history'
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Danger Zone Form state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Populate data from user
  useEffect(() => {
    if (user) {
      setProfileForm({
        display_name: user.display_name || user.username || '',
        username: user.username || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        github_url: user.github_url || '',
        linkedin_url: user.linkedin_url || '',
        avatar_url: user.avatar_url || ''
      });

      const userSettings = user.settings || {};
      setSettingsForm({
        preferred_theme: userSettings.preferred_theme || theme || 'dark',
        ui_language: userSettings.ui_language || lang || 'vi',
        content_language: userSettings.content_language || 'all',
        reading_font_size: userSettings.reading_font_size || 'medium',
        reduce_motion: userSettings.reduce_motion || false,
        record_reading_history: userSettings.record_reading_history !== false,
        default_library_tab: userSettings.default_library_tab || 'history'
      });
    }
  }, [user]);

  // Handle section switch
  const handleSelectSection = (id) => {
    navigate(`/settings/${id}`);
  };

  // Avatar Upload Handler
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast(lang === 'vi' ? 'Dung lượng ảnh tối đa là 2MB.' : 'Maximum image size is 2MB.', 'error');
      return;
    }

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await mediaService.uploadUserImage(formData);
      if (res.data?.success && res.data?.data?.file_url) {
        setProfileForm(prev => ({ ...prev, avatar_url: res.data.data.file_url }));
        showToast(lang === 'vi' ? 'Đã tải ảnh đại diện lên thành công!' : 'Avatar uploaded successfully!');
      } else {
        throw new Error(res.data?.message || 'Upload failed');
      }
    } catch (err) {
      showToast(err.response?.data?.message || (lang === 'vi' ? 'Tải ảnh thất bại.' : 'Failed to upload avatar.'), 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Remove Avatar Handler
  const handleRemoveAvatar = () => {
    setProfileForm(prev => ({ ...prev, avatar_url: '' }));
  };

  // Save Profile Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.display_name.trim()) {
      showToast(lang === 'vi' ? 'Tên hiển thị không được để trống.' : 'Display name cannot be empty.', 'error');
      return;
    }
    if (profileForm.display_name.length < 2 || profileForm.display_name.length > 50) {
      showToast(lang === 'vi' ? 'Tên hiển thị phải từ 2 đến 50 ký tự.' : 'Display name must be between 2 and 50 characters.', 'error');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await authService.updateProfile(profileForm);
      if (res.data?.success) {
        updateUserData(res.data.data);
        showToast(lang === 'vi' ? 'Hồ sơ cá nhân đã được lưu thành công!' : 'Profile updated successfully!');
      } else {
        showToast(res.data?.message || 'Update failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || (lang === 'vi' ? 'Lỗi khi cập nhật hồ sơ.' : 'Error updating profile.'), 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwdForm.currentPassword) {
      showToast(lang === 'vi' ? 'Vui lòng nhập mật khẩu hiện tại.' : 'Please enter current password.', 'error');
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      showToast(lang === 'vi' ? 'Mật khẩu mới phải có tối thiểu 8 ký tự.' : 'New password must be at least 8 characters.', 'error');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      showToast(lang === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Confirm password does not match.', 'error');
      return;
    }

    try {
      setPwdSaving(true);
      const res = await authService.changePassword({
        current_password: pwdForm.currentPassword,
        new_password: pwdForm.newPassword
      });
      if (res.data?.success) {
        showToast(lang === 'vi' ? 'Đổi mật khẩu thành công!' : 'Password changed successfully!');
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast(res.data?.message || 'Error', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || (lang === 'vi' ? 'Lỗi khi đổi mật khẩu.' : 'Failed to change password.'), 'error');
    } finally {
      setPwdSaving(false);
    }
  };

  // Save Settings Handler
  const handleSaveSettings = async (partialSettings) => {
    const updated = { ...settingsForm, ...partialSettings };
    setSettingsForm(updated);

    // Apply immediate UI changes
    if (partialSettings.preferred_theme) {
      setTheme(partialSettings.preferred_theme);
    }
    if (partialSettings.ui_language) {
      changeLanguage(partialSettings.ui_language);
    }
    if (partialSettings.reading_font_size) {
      setReadingFontSize(partialSettings.reading_font_size);
    }

    try {
      setSettingsSaving(true);
      const res = await authService.updateSettings(updated);
      if (res.data?.success) {
        updateUserData(res.data.data);
        showToast(lang === 'vi' ? 'Cài đặt đã được lưu.' : 'Settings saved successfully.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || (lang === 'vi' ? 'Lỗi khi lưu cài đặt.' : 'Error saving settings.'), 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Export Data Handler
  const handleExportData = async () => {
    try {
      setExporting(true);
      const res = await authService.exportData();
      if (res.data?.success && res.data?.data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `allinoneblog_user_data_${user.username || 'export'}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast(lang === 'vi' ? 'Đã tải xuống gói dữ liệu cá nhân!' : 'Personal data package downloaded!');
      }
    } catch (err) {
      showToast(lang === 'vi' ? 'Lỗi khi trích xuất dữ liệu.' : 'Failed to export data.', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'XÓA' && deleteConfirmText !== 'DELETE') {
      showToast(lang === 'vi' ? 'Vui lòng gõ chữ XÓA để xác nhận.' : 'Please type DELETE to confirm.', 'error');
      return;
    }
    if (!deletePassword) {
      showToast(lang === 'vi' ? 'Vui lòng nhập mật khẩu tài khoản.' : 'Please enter your password.', 'error');
      return;
    }

    try {
      setDeleting(true);
      const res = await authService.deleteAccount({ password: deletePassword });
      if (res.data?.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    } catch (err) {
      showToast(err.response?.data?.message || (lang === 'vi' ? 'Không thể xóa tài khoản.' : 'Failed to delete account.'), 'error');
      setDeleting(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-zinc-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: lang === 'vi' ? 'Yếu' : 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 2, label: lang === 'vi' ? 'Trung bình' : 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: lang === 'vi' ? 'Mạnh' : 'Strong', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(pwdForm.newPassword);

  if (!user) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <Lock className="w-12 h-12 mx-auto text-zinc-400 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {lang === 'vi' ? 'Vui lòng đăng nhập' : 'Authentication Required'}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
          {lang === 'vi' ? 'Bạn cần đăng nhập để truy cập và quản lý cài đặt tài khoản.' : 'Please sign in to access and manage your settings.'}
        </p>
        <Link 
          to="/login"
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          {lang === 'vi' ? 'Đăng nhập ngay' : 'Sign in now'}
        </Link>
      </div>
    );
  }

  const currentSectionMeta = SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="py-8 pb-16 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border transition-all animate-bounce-subtle ${
          toast.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 backdrop-blur-md'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 backdrop-blur-md'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {lang === 'vi' ? 'Cài đặt hệ thống' : 'Account Settings'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {lang === 'vi' ? 'Quản lý thông tin tài khoản, tùy chọn giao diện, bảo mật và quyền riêng tư cá nhân.' : 'Manage your profile details, interface preferences, security credentials, and data privacy.'}
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-1">
          <nav className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 shadow-sm">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => handleSelectSection(sec.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200 dark:border-indigo-800/40'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <span className="truncate">{lang === 'vi' ? sec.labelVi : sec.labelEn}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-indigo-500 opacity-80" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-6">

          {/* 1. PROFILE SECTION */}
          {activeSection === 'profile' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Form Col */}
              <div className="xl:col-span-7 bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Hồ sơ cá nhân' : 'Public Profile'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {lang === 'vi' ? 'Thông tin này sẽ được hiển thị công khai trên bài viết và bình luận của bạn.' : 'This info will be displayed publicly on your articles and comments.'}
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {/* Avatar Upload */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                      {lang === 'vi' ? 'Ảnh đại diện (Avatar)' : 'Profile Avatar'}
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 shadow-inner">
                        {profileForm.avatar_url ? (
                          <img src={profileForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                            {profileForm.display_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{avatarUploading ? (lang === 'vi' ? 'Đang tải...' : 'Uploading...') : (lang === 'vi' ? 'Tải ảnh mới' : 'Upload photo')}</span>
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp" 
                            onChange={handleAvatarChange} 
                            disabled={avatarUploading}
                            className="hidden" 
                          />
                        </label>
                        {profileForm.avatar_url && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{lang === 'vi' ? 'Xóa ảnh' : 'Remove'}</span>
                          </button>
                        )}
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block w-full mt-0.5">
                          {lang === 'vi' ? 'Hỗ trợ PNG, JPG, WebP tối đa 2MB.' : 'Supports PNG, JPG, WebP up to 2MB.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      {lang === 'vi' ? 'Tên hiển thị' : 'Display Name'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm(p => ({ ...p, display_name: e.target.value }))}
                      placeholder={lang === 'vi' ? 'Ví dụ: Đỗ Trí Kiên' : 'e.g. John Doe'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      {lang === 'vi' ? 'Tên đăng nhập (Username)' : 'Username'}
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-zinc-400 text-sm">@</span>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm(p => ({ ...p, username: e.target.value }))}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400/90 mt-1">
                      {lang === 'vi' ? '⚠️ Thay đổi username sẽ làm thay đổi link hồ sơ và định danh đăng nhập của bạn.' : '⚠️ Changing username affects your public profile link and login credentials.'}
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {lang === 'vi' ? 'Giới thiệu ngắn (Bio)' : 'Short Bio'}
                      </label>
                      <span className={`text-[11px] ${profileForm.bio.length > 160 ? 'text-rose-500 font-bold' : 'text-zinc-400'}`}>
                        {profileForm.bio.length}/160
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={160}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder={lang === 'vi' ? 'Chia sẻ đôi dòng về bản thân, chuyên môn hoặc định hướng phát triển...' : 'A brief description about your expertise or interests...'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  {/* Location & Occupation */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      {lang === 'vi' ? 'Địa điểm / Nghề nghiệp' : 'Location / Role'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm(p => ({ ...p, location: e.target.value }))}
                      placeholder={lang === 'vi' ? 'Hà Nội, Việt Nam • DevOps / Full-Stack Engineer' : 'San Francisco, CA • Software Engineer'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Social Links */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {lang === 'vi' ? 'Liên kết mạng xã hội' : 'Social Profiles'}
                    </label>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm(p => ({ ...p, website: e.target.value }))}
                        placeholder="Website / Portfolio URL"
                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                        <GithubIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={profileForm.github_url}
                        onChange={(e) => setProfileForm(p => ({ ...p, github_url: e.target.value }))}
                        placeholder="https://github.com/username"
                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                        <LinkedinIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={profileForm.linkedin_url}
                        onChange={(e) => setProfileForm(p => ({ ...p, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{profileSaving ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu hồ sơ' : 'Save Profile')}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Preview Card Col */}
              <div className="xl:col-span-5 space-y-4">
                <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm sticky top-6">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {lang === 'vi' ? 'Xem trước hồ sơ' : 'Live Profile Card'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Live
                    </span>
                  </div>

                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full mx-auto overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-indigo-500/40 shadow-md flex items-center justify-center mb-3">
                      {profileForm.avatar_url ? (
                        <img src={profileForm.avatar_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                          {profileForm.display_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      {profileForm.display_name || user.username}
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      @{profileForm.username || user.username}
                    </p>
                    {profileForm.location && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        📍 {profileForm.location}
                      </p>
                    )}
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-3 px-2 line-clamp-3 italic">
                      "{profileForm.bio || (lang === 'vi' ? 'Chưa cập nhật giới thiệu cá nhân.' : 'No bio provided yet.')}"
                    </p>

                    <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                      {profileForm.website && (
                        <a href={profileForm.website} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition">
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      {profileForm.github_url && (
                        <a href={profileForm.github_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition">
                          <GithubIcon className="w-4 h-4" />
                        </a>
                      )}
                      {profileForm.linkedin_url && (
                        <a href={profileForm.linkedin_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition">
                          <LinkedinIcon className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECURITY SECTION */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* Account Credentials */}
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Thông tin đăng nhập & Email' : 'Account Credentials'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {lang === 'vi' ? 'Quản lý địa chỉ email nhận thông báo và bảo mật tài khoản.' : 'Manage your email and security status.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Email
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="email"
                        readOnly
                        value={user.email}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 text-sm cursor-not-allowed"
                      />
                      <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === 'vi' ? 'Đã xác thực' : 'Verified'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Đổi mật khẩu' : 'Change Password'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {lang === 'vi' ? 'Khuyến khích sử dụng mật khẩu mạnh dài ít nhất 8 ký tự kèm chữ hoa, số và ký tự đặc biệt.' : 'Use a strong password with letters, numbers, and symbols.'}
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      {lang === 'vi' ? 'Mật khẩu hiện tại' : 'Current Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd.current ? 'text' : 'password'}
                        required
                        value={pwdForm.currentPassword}
                        onChange={(e) => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(p => ({ ...p, current: !p.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {showPwd.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      {lang === 'vi' ? 'Mật khẩu mới (tối thiểu 8 ký tự)' : 'New Password (min 8 characters)'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd.new ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={pwdForm.newPassword}
                        onChange={(e) => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {pwdForm.newPassword && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 dark:text-zinc-400">{lang === 'vi' ? 'Độ mạnh mật khẩu:' : 'Password strength:'}</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{pwdStrength.label}</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${pwdStrength.color}`} 
                            style={{ width: `${(pwdStrength.score / 3) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      {lang === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd.confirm ? 'text' : 'password'}
                        required
                        value={pwdForm.confirmPassword}
                        onChange={(e) => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(p => ({ ...p, confirm: !p.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        {showPwd.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={pwdSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{pwdSaving ? (lang === 'vi' ? 'Đang cập nhật...' : 'Updating...') : (lang === 'vi' ? 'Cập nhật mật khẩu' : 'Update Password')}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Sessions */}
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Phiên đăng nhập hiện tại' : 'Active Sessions'}
                  </h2>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {navigator.userAgent.includes('Windows') ? 'Windows PC' : 'Web Browser'} • Chrome / Edge
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {lang === 'vi' ? 'Đang hoạt động trên thiết bị này' : 'Currently active on this device'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {lang === 'vi' ? 'Trực tuyến' : 'Online'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. APPEARANCE SECTION */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Chủ đề giao diện' : 'Interface Theme'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {lang === 'vi' ? 'Chọn phong cách hiển thị sáng hoặc tối phù hợp với mắt của bạn.' : 'Select light or dark mode for reading comfort.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark Theme Option */}
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ preferred_theme: 'dark' })}
                    className={`cursor-pointer p-4 rounded-xl border-2 text-left transition-all ${
                      theme === 'dark'
                        ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-zinc-950 p-2.5 flex flex-col justify-between mb-3 border border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="w-3/4 h-2 bg-zinc-800 rounded" />
                        <div className="w-1/2 h-2 bg-zinc-800 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {lang === 'vi' ? 'Giao diện Tối (Dark)' : 'Dark Mode'}
                        </span>
                      </div>
                      {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                    </div>
                  </button>

                  {/* Light Theme Option */}
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ preferred_theme: 'light' })}
                    className={`cursor-pointer p-4 rounded-xl border-2 text-left transition-all ${
                      theme === 'light'
                        ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-white p-2.5 flex flex-col justify-between mb-3 border border-zinc-200 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="w-3/4 h-2 bg-zinc-200 rounded" />
                        <div className="w-1/2 h-2 bg-zinc-200 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {lang === 'vi' ? 'Giao diện Sáng (Light)' : 'Light Mode'}
                        </span>
                      </div>
                      {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Language Settings */}
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Ngôn ngữ giao diện' : 'Interface Language'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ ui_language: 'vi' })}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition ${
                      lang === 'vi'
                        ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>Tiếng Việt (VI)</span>
                    {lang === 'vi' && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ ui_language: 'en' })}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition ${
                      lang === 'en'
                        ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>English (EN)</span>
                    {lang === 'en' && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                  </button>
                </div>
              </div>

              {/* Reading Font Size */}
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Cỡ chữ đọc bài viết' : 'Reading Font Size'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {lang === 'vi' ? 'Áp dụng cho nội dung toàn bộ bài viết trên blog khi bạn đọc.' : 'Applies to article content across all blog posts.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'small', labelVi: 'Nhỏ (15px)', labelEn: 'Small' },
                    { id: 'medium', labelVi: 'Chuẩn (16px)', labelEn: 'Medium' },
                    { id: 'large', labelVi: 'Lớn (18px)', labelEn: 'Large' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSaveSettings({ reading_font_size: opt.id })}
                      className={`py-3 rounded-xl border-2 text-center text-sm font-medium transition ${
                        (settingsForm.reading_font_size || readingFontSize) === opt.id
                          ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {lang === 'vi' ? opt.labelVi : opt.labelEn}
                    </button>
                  ))}
                </div>

                {/* Live Preview of Reading Font Size */}
                <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    {lang === 'vi' ? 'Xem trước nội dung đọc thử' : 'Reading Preview'}
                  </span>
                  <p className="text-zinc-700 dark:text-zinc-300 transition-all blog-content-preview">
                    {lang === 'vi' 
                      ? 'Đây là kích thước văn bản mẫu khi bạn đọc bài viết trên AllinOneBlog. Cỡ chữ và khoảng cách dòng được tối ưu để mắt luôn thoải mái.'
                      : 'This is sample text demonstrating the font size when reading articles on AllinOneBlog. Typography is optimized for reading comfort.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. READING SECTION */}
          {activeSection === 'reading' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Tùy chọn Thư viện & Lịch sử đọc' : 'Library & Reading History'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {lang === 'vi' ? 'Quản lý việc lưu vết các bài viết bạn đã từng đọc.' : 'Configure automatic history recording for read articles.'}
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Record History Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {lang === 'vi' ? 'Ghi lại lịch sử đọc bài' : 'Record reading history'}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {lang === 'vi' ? 'Tự động lưu bài viết vào Thư viện của tôi khi bạn đọc.' : 'Automatically save posts to your library when you view them.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsForm.record_reading_history}
                        onChange={(e) => handleSaveSettings({ record_reading_history: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Default Tab in Library */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                      {lang === 'vi' ? 'Tab mặc định khi mở Thư viện' : 'Default tab when opening Library'}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'history', labelVi: 'Lịch sử đọc', labelEn: 'History' },
                        { id: 'liked', labelVi: 'Đã thích', labelEn: 'Liked' },
                        { id: 'saved', labelVi: 'Lưu đọc sau', labelEn: 'Saved' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleSaveSettings({ default_library_tab: tab.id })}
                          className={`py-2.5 rounded-xl border text-xs font-medium transition ${
                            settingsForm.default_library_tab === tab.id
                              ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                          }`}
                        >
                          {lang === 'vi' ? tab.labelVi : tab.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear History Shortcut */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {lang === 'vi' ? 'Dọn dẹp lịch sử' : 'Clear Reading History'}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {lang === 'vi' ? 'Xóa toàn bộ lịch sử các bài viết đã xem khỏi tài khoản của bạn.' : 'Wipe all viewed articles from your account history.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(lang === 'vi' ? 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử đọc bài?' : 'Are you sure you want to clear your reading history?')) {
                          try {
                            await userService.clearHistory();
                            showToast(lang === 'vi' ? 'Đã xóa toàn bộ lịch sử đọc bài.' : 'Reading history cleared.');
                          } catch (err) {
                            showToast(lang === 'vi' ? 'Lỗi khi xóa lịch sử.' : 'Failed to clear history.', 'error');
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Xóa lịch sử ngay' : 'Clear History'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. PRIVACY & DANGER ZONE SECTION */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              {/* Data Export Card */}
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {lang === 'vi' ? 'Sao lưu dữ liệu cá nhân' : 'Export Personal Data'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {lang === 'vi' ? 'Tải về toàn bộ thông tin hồ sơ, thống kê, bài viết đã thích, đã lưu và lịch sử đọc dạng tệp tin JSON tiêu chuẩn.' : 'Download your profile information, reading history, likes, and bookmarks as a standard JSON bundle.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    📦 {lang === 'vi' ? 'Bao gồm: Hồ sơ, Lịch sử đọc, Đã thích, Lưu đọc sau' : 'Includes: Profile, Reading History, Likes, Bookmarks'}
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-zinc-300 dark:border-zinc-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>{exporting ? (lang === 'vi' ? 'Đang trích xuất...' : 'Exporting...') : (lang === 'vi' ? 'Tải về gói JSON' : 'Export JSON')}</span>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border-2 border-rose-500/40 bg-rose-50/10 dark:bg-rose-950/20 p-6 shadow-sm">
                <div className="border-b border-rose-200 dark:border-rose-900/60 pb-4 mb-4">
                  <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    <span>{lang === 'vi' ? 'Vùng nguy hiểm (Danger Zone)' : 'Danger Zone'}</span>
                  </h2>
                  <p className="text-xs text-rose-500/80 dark:text-rose-400/80 mt-0.5">
                    {lang === 'vi' ? 'Các hành động tại đây là vĩnh viễn và không thể đảo ngược.' : 'Actions taken here are irreversible.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {lang === 'vi' ? 'Xóa tài khoản của bạn' : 'Delete Account'}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {lang === 'vi' ? 'Toàn bộ dữ liệu hồ sơ, lịch sử, bài đã lưu và bình luận sẽ bị hủy bỏ vĩnh viễn.' : 'Permanently remove your personal profile, reading history, bookmarks, and comments.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-lg shadow-rose-600/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{lang === 'vi' ? 'Xóa tài khoản' : 'Delete Account'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Account Deletion Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold">{lang === 'vi' ? 'Xác nhận xóa tài khoản' : 'Confirm Account Deletion'}</h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {lang === 'vi' 
                ? 'Hành động này sẽ xóa vĩnh viễn tài khoản của bạn và không thể khôi phục. Để tiếp tục, vui lòng gõ chữ XÓA vào ô dưới đây và nhập mật khẩu của bạn.'
                : 'This action is irreversible. All your data will be permanently purged. Type DELETE below and enter your password to proceed.'}
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Gõ "XÓA" để xác nhận' : 'Type "DELETE" to confirm'}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={lang === 'vi' ? 'XÓA' : 'DELETE'}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  {lang === 'vi' ? 'Mật khẩu tài khoản' : 'Your Password'}
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                {lang === 'vi' ? 'Hủy bỏ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
              >
                {deleting ? (lang === 'vi' ? 'Đang xóa...' : 'Deleting...') : (lang === 'vi' ? 'Tôi hiểu, hãy xóa tài khoản' : 'Confirm Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
