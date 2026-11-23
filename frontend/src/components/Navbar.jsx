import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sun, Moon, Search, Globe, User, LogOut, Bookmark, 
  ShieldCheck, Menu, X, Settings, Bell, Check, Trash2, 
  ExternalLink, Mail, AlertTriangle, Info, Sparkles, Inbox 
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { notificationService } from '../services/notificationService';

export default function Navbar() {
  const { theme, toggleTheme, lang, changeLanguage, t, user, logoutUser, setIsSpotlightOpen } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.blog'), path: '/blog' },
    { name: t('nav.series'), path: '/series' },
    { name: t('nav.certificates'), path: '/certificates' },
    { name: t('nav.videos'), path: '/videos' },
    { name: t('nav.albums'), path: '/album' },
  ];

  // Tải danh sách thông báo khi người dùng đã đăng nhập
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await notificationService.getNotifications();
      const data = res?.data || res;
      if (data) {
        setNotifications(Array.isArray(data.items) ? data.items : []);
        setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Polling nhẹ mỗi 45 giây để cập nhật thông báo mới
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  const handleMarkNotifRead = async (id, link, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (link) {
        setIsNotifOpen(false);
        navigate(link);
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleDeleteNotif = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      const target = notifications.find(n => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsNotifOpen(false);
      }
    };
    if (isUserMenuOpen || isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen, isNotifOpen]);

  // Close menu on route navigation
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logoutUser();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-100 group">
          <img
            src="/Logo_AllinOneBlog.png"
            alt="AllInOneBlog Logo"
            className="h-8 w-8 object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform"
          />
          <span className="hidden sm:inline">AllInOne<span className="text-blue-600 dark:text-blue-400">Blog</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Tools: Spotlight, Language, Theme, User Auth */}
        <div className="flex items-center gap-2">
          {/* Spotlight Search Button */}
          <button
            onClick={() => setIsSpotlightOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={t('nav.search')}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'en' ? 'Search' : 'Tìm kiếm'}</span>
            <kbd className="hidden sm:inline px-1 py-0.5 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Language Switcher (VI / EN) */}
          <button
            onClick={() => changeLanguage(lang === 'vi' ? 'en' : 'vi')}
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Đổi ngôn ngữ"
          >
            <Globe className="w-4 h-4" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notification Bell Dropdown (Chỉ hiện khi đã đăng nhập) */}
          {user && (
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
                title="Thông báo"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden z-50 animate-scale-up text-xs">
                  {/* Panel Header */}
                  <div className="p-3.5 px-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Thông Báo</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                          {unreadCount} mới
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotifsRead}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Đọc tất cả</span>
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-zinc-400 space-y-1">
                        <Bell className="w-8 h-8 mx-auto stroke-1 text-zinc-300 dark:text-zinc-700 mb-1" />
                        <p className="font-medium">Chưa có thông báo nào.</p>
                        <p className="text-[11px] text-zinc-500">Các hoạt động và tin nhắn mới sẽ hiển thị tại đây.</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isContact = n.type === 'contact';
                        const isSecurity = n.type === 'security';
                        const isSystem = n.type === 'system';

                        return (
                          <div
                            key={n.id}
                            onClick={(e) => handleMarkNotifRead(n.id, n.link, e)}
                            className={`p-3.5 px-4 flex items-start justify-between gap-3 cursor-pointer transition group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                              !n.is_read ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              {/* Type Icon */}
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  isContact
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : isSecurity
                                    ? 'bg-rose-500/10 text-rose-500'
                                    : isSystem
                                    ? 'bg-purple-500/10 text-purple-500'
                                    : 'bg-indigo-500/10 text-indigo-500'
                                }`}
                              >
                                {isContact && <Mail className="w-3.5 h-3.5" />}
                                {isSecurity && <AlertTriangle className="w-3.5 h-3.5" />}
                                {isSystem && <Sparkles className="w-3.5 h-3.5" />}
                                {!isContact && !isSecurity && !isSystem && <Info className="w-3.5 h-3.5" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  {!n.is_read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  )}
                                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                    {n.title}
                                  </h4>
                                </div>
                                <p className="text-zinc-600 dark:text-zinc-400 text-[11px] line-clamp-2 leading-relaxed">
                                  {n.message}
                                </p>
                                <span className="text-[10px] text-zinc-400 mt-1 block font-mono">
                                  {n.created_at
                                    ? new Date(n.created_at).toLocaleString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        day: '2-digit',
                                        month: '2-digit'
                                      })
                                    : ''}
                                </span>
                              </div>
                            </div>

                            {/* Action to delete */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteNotif(n.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition rounded"
                              title="Xóa thông báo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Panel Footer (Xem thêm nếu là Admin) */}
                  {user.role === 'admin' && (
                    <div className="p-2.5 border-t border-zinc-100 dark:border-zinc-800 text-center bg-zinc-50/50 dark:bg-zinc-900/50">
                      <Link
                        to="/admin?tab=messages"
                        onClick={() => setIsNotifOpen(false)}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Quản lý tin nhắn liên hệ</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Account Menu / Login */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title={user.username}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {user.username.charAt(0)}
                  </div>
                )}
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in text-sm">
                  <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                        {user.username.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-xs">{user.username}</p>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          user.role === 'admin'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/inbox"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                        location.pathname === '/inbox' || location.pathname === '/messages'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Inbox className="w-4 h-4 text-blue-500" />
                      <span>Hộp thư liên hệ</span>
                    </Link>

                    <Link
                      to="/my-library"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                        location.pathname === '/library' || location.pathname === '/my-library'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 text-indigo-500" />
                      <span>{t('nav.library')}</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                        location.pathname.startsWith('/settings')
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Settings className="w-4 h-4 text-zinc-500" />
                      <span>{t('nav.settings') || 'Cài đặt'}</span>
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                          location.pathname.startsWith('/admin')
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>{t('nav.admin')}</span>
                      </Link>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 p-1.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left font-medium transition text-xs sm:text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>{t('nav.login')}</span>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              {link.name}
            </Link>
          ))}
          {user && (
            <Link
              to="/my-library"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              {t('nav.library')}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
