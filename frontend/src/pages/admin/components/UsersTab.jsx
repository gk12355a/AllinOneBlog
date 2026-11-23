import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, ShieldAlert, UserCheck, UserX, 
  Search, AlertCircle, CheckCircle2, MoreVertical, 
  Clock, Laptop, Smartphone, Tablet, HelpCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Radio, Wifi, Circle, KeyRound, Sparkles, Copy, Check, Eye, EyeOff
} from 'lucide-react';
import userService from '../../../services/userService';
import { useApp } from '../../../contexts/AppContext';
import { getSocket } from '../../../services/socketService';
import PaginationControl from './PaginationControl';

export default function UsersTab({ users = [], currentUser, onRefresh }) {
  const { lang } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlineFilter, setOnlineFilter] = useState('all'); // 'all' | 'online' | 'offline'

  // Phân trang & Tùy chỉnh số dòng hiển thị
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 5, 10, 20, 50

  // Danh sách ID các User đang online (nhận realtime từ WebSocket và từ API)
  const [onlineUserIds, setOnlineUserIds] = useState(() => {
    return users.filter(u => u.is_online).map(u => u.id);
  });

  // Lắng nghe WebSocket sự kiện users:online
  useEffect(() => {
    const socket = getSocket();
    const handleUsersOnline = (payload) => {
      if (payload && Array.isArray(payload.online_user_ids)) {
        setOnlineUserIds(payload.online_user_ids);
      }
    };

    socket.on('users:online', handleUsersOnline);

    // Chủ động request danh sách online ngay khi mở tab
    const token = localStorage.getItem('token');
    socket.emit('admin:get_online_users', { token });

    return () => {
      socket.off('users:online', handleUsersOnline);
    };
  }, []);

  // Cập nhật onlineUserIds nếu users prop thay đổi
  useEffect(() => {
    const idsFromProps = users.filter(u => u.is_online).map(u => u.id);
    if (idsFromProps.length > 0) {
      setOnlineUserIds(prev => Array.from(new Set([...prev, ...idsFromProps])));
    }
  }, [users]);

  // Modal State cho Khóa / Mở khóa
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    user: null,
    targetActive: false,
    reason: '',
    loading: false
  });

  // Modal State cho Đổi vai trò
  const [roleModal, setRoleModal] = useState({
    isOpen: false,
    user: null,
    targetRole: 'user',
    loading: false
  });

  // Modal State cho Reset Mật khẩu
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    user: null,
    password: '',
    showPassword: true,
    copied: false,
    loading: false,
    error: '',
    successMessage: ''
  });

  // Reset về trang 1 khi thay đổi điều kiện lọc hoặc đổi pageSize
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, onlineFilter, pageSize]);

  // Lọc người dùng
  const filteredUsers = users.filter(u => {
    const isOnline = onlineUserIds.includes(u.id);

    const matchSearch = u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || 
                        (statusFilter === 'active' && u.is_active && !u.is_locked) ||
                        (statusFilter === 'disabled' && (!u.is_active || u.is_locked));
    const matchOnline = onlineFilter === 'all' || 
                        (onlineFilter === 'online' && isOnline) ||
                        (onlineFilter === 'offline' && !isOnline);

    return matchSearch && matchRole && matchStatus && matchOnline;
  });

  // Tính toán dữ liệu theo phân trang
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const onlineCount = users.filter(u => onlineUserIds.includes(u.id)).length;

  // Mở modal khóa/mở khóa
  const handleOpenStatusModal = (u, targetActive) => {
    setStatusModal({
      isOpen: true,
      user: u,
      targetActive,
      reason: targetActive ? '' : 'Vi phạm quy định diễn đàn / bảo mật',
      loading: false
    });
  };

  // Xác nhận khóa/mở khóa
  const handleConfirmStatus = async () => {
    if (!statusModal.user) return;
    try {
      setStatusModal(prev => ({ ...prev, loading: true }));
      await userService.updateUserStatus(statusModal.user.id, {
        active: statusModal.targetActive,
        reason: statusModal.reason
      });
      setStatusModal({ isOpen: false, user: null, targetActive: false, reason: '', loading: false });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Thao tác cập nhật trạng thái thất bại.');
      setStatusModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Mở modal đổi vai trò
  const handleOpenRoleModal = (u, targetRole) => {
    setRoleModal({
      isOpen: true,
      user: u,
      targetRole,
      loading: false
    });
  };

  // Xác nhận đổi vai trò
  const handleConfirmRole = async () => {
    if (!roleModal.user) return;
    try {
      setRoleModal(prev => ({ ...prev, loading: true }));
      await userService.updateUserRole(roleModal.user.id, {
        role: roleModal.targetRole
      });
      setRoleModal({ isOpen: false, user: null, targetRole: 'user', loading: false });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Thao tác đổi vai trò thất bại.');
      setRoleModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Sinh mật khẩu ngẫu nhiên an toàn (10 ký tự: Hoa, thường, số, ký tự đặc biệt)
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Mở modal Reset Password
  const handleOpenResetModal = (u) => {
    const generated = generateRandomPassword();
    setResetModal({
      isOpen: true,
      user: u,
      password: generated,
      showPassword: true,
      copied: false,
      loading: false,
      error: '',
      successMessage: ''
    });
  };

  // Copy mật khẩu vào Clipboard
  const handleCopyPassword = () => {
    if (!resetModal.password) return;
    navigator.clipboard.writeText(resetModal.password);
    setResetModal(prev => ({ ...prev, copied: true }));
    setTimeout(() => {
      setResetModal(prev => ({ ...prev, copied: false }));
    }, 2000);
  };

  // Xác nhận Reset Password
  const handleConfirmResetPassword = async () => {
    if (!resetModal.user) return;
    if (!resetModal.password || resetModal.password.length < 6) {
      setResetModal(prev => ({ ...prev, error: 'Mật khẩu phải có ít nhất 6 ký tự.' }));
      return;
    }
    try {
      setResetModal(prev => ({ ...prev, loading: true, error: '' }));
      const res = await userService.resetUserPassword(resetModal.user.id, {
        password: resetModal.password
      });
      setResetModal(prev => ({ 
        ...prev, 
        loading: false, 
        successMessage: res.message || 'Đặt lại mật khẩu thành công!' 
      }));
      setTimeout(() => {
        setResetModal({
          isOpen: false,
          user: null,
          password: '',
          showPassword: true,
          copied: false,
          loading: false,
          error: '',
          successMessage: ''
        });
        if (onRefresh) onRefresh();
      }, 1500);
    } catch (err) {
      setResetModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: err.response?.data?.message || err.message || 'Đặt lại mật khẩu thất bại.' 
      }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'vi' ? 'Quản Lý Người Dùng & Phân Quyền' : 'User Management & Roles'}</span>
            </h2>
            {onlineCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{onlineCount} {lang === 'vi' ? 'đang online' : 'online'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {lang === 'vi' 
              ? 'Kiểm soát danh sách thành viên, phân quyền Admin/User, khóa và thu hồi phiên truy cập tức thì.' 
              : 'Manage registered users, assign roles, lock accounts and revoke active sessions instantly.'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'vi' ? 'Tìm theo tên, username, email...' : 'Search users...'}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc Trạng thái Online */}
          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{lang === 'vi' ? 'Tất cả kết nối' : 'All Connection'}</option>
            <option value="online">🟢 {lang === 'vi' ? 'Đang Online' : 'Online'}</option>
            <option value="offline">⚪ {lang === 'vi' ? 'Ngoại tuyến (Offline)' : 'Offline'}</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{lang === 'vi' ? 'Tất cả vai trò' : 'All Roles'}</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="user">Người dùng (User)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{lang === 'vi' ? 'Tất cả trạng thái' : 'All Status'}</option>
            <option value="active">{lang === 'vi' ? 'Đang hoạt động' : 'Active'}</option>
            <option value="disabled">{lang === 'vi' ? 'Đã khóa / Tạm dừng' : 'Disabled / Locked'}</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Thành viên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Đăng nhập gần nhất</th>
                <th className="py-3 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400">
                    <Users className="w-8 h-8 mx-auto stroke-1 mb-2 text-zinc-500" />
                    <span>Không tìm thấy người dùng nào phù hợp.</span>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isLocked = !u.is_active || u.is_locked;
                  const isOnline = onlineUserIds.includes(u.id);

                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                      {/* Thành viên + Avatar có Tín hiệu Online */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 border border-zinc-200 dark:border-zinc-700">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                              ) : (
                                u.username?.charAt(0).toUpperCase()
                              )}
                            </div>
                            {/* Chấm tín hiệu Online/Offline */}
                            <span 
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${
                                isOnline 
                                  ? 'bg-emerald-500 shadow-xs' 
                                  : 'bg-zinc-300 dark:bg-zinc-600'
                              }`}
                              title={isOnline ? 'Đang Online' : 'Ngoại tuyến (Offline)'}
                            >
                              {isOnline && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-emerald-100 animate-ping opacity-75"></span>
                              )}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                              <span>{u.display_name || u.username}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/50">
                                  Bạn
                                </span>
                              )}
                              {isOnline && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  • online
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                        {u.email}
                      </td>

                      {/* Vai trò */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20'
                        }`}>
                          <Shield className="w-3 h-3" />
                          <span>{u.role === 'admin' ? 'Quản trị' : 'Thành viên'}</span>
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-max ${
                            !isLocked
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            {!isLocked ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span>{!isLocked ? 'Hoạt động' : 'Đã vô hiệu hóa'}</span>
                          </span>
                          {u.disabled_reason && (
                            <span className="text-[10px] text-zinc-400 max-w-xs truncate" title={u.disabled_reason}>
                              Lý do: {u.disabled_reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Đăng nhập gần nhất (IP & Thiết bị) */}
                      <td className="py-3.5 px-4 text-zinc-500">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            {u.last_login_ip || 'Chưa có'}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {u.last_login_at ? new Date(u.last_login_at).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                          </span>
                        </div>
                      </td>

                      {/* Hành động */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Đổi vai trò */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleOpenRoleModal(u, u.role === 'admin' ? 'user' : 'admin')}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                              title={u.role === 'admin' ? 'Hạ quyền xuống User' : 'Thăng cấp lên Admin'}
                            >
                              {u.role === 'admin' ? 'Hạ quyền' : 'Lên Admin'}
                            </button>
                          )}

                          {/* Reset Mật khẩu */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(u)}
                            className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                            title="Đặt lại mật khẩu cho tài khoản này"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Khóa / Mở khóa */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(u, isLocked)}
                              className={`p-1.5 rounded-lg border transition ${
                                !isLocked
                                  ? 'border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  : 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                              title={!isLocked ? 'Vô hiệu hóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {!isLocked ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Điều Hướng Phân Trang & Tùy chỉnh số lượng dòng (Rows per page) */}
        <PaginationControl
          currentPage={validCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="thành viên"
          itemLabelEn="users"
        />
      </div>

      {/* Modal Khóa / Mở khóa tài khoản */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${statusModal.targetActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {statusModal.targetActive ? <UserCheck className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {statusModal.targetActive ? 'Xác nhận mở khóa tài khoản' : 'Xác nhận vô hiệu hóa tài khoản'}
                </h4>
                <p className="text-xs text-zinc-400">@{statusModal.user?.username}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {statusModal.targetActive 
                ? 'Tài khoản này sẽ được khôi phục quyền đăng nhập và tham gia các tính năng bình thường.' 
                : 'Người dùng này sẽ bị thu hồi toàn bộ phiên đăng nhập lập tức và không thể truy cập lại hệ thống cho đến khi được mở khóa.'}
            </p>

            {!statusModal.targetActive && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Lý do vô hiệu hóa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={statusModal.reason}
                  onChange={(e) => setStatusModal(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Nhập lý do khóa..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStatusModal({ isOpen: false, user: null, targetActive: false, reason: '', loading: false })}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={statusModal.loading || (!statusModal.targetActive && !statusModal.reason.trim())}
                onClick={handleConfirmStatus}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition disabled:opacity-50 ${
                  statusModal.targetActive 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {statusModal.loading ? 'Đang xử lý...' : (statusModal.targetActive ? 'Mở khóa ngay' : 'Vô hiệu hóa')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi vai trò */}
      {roleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
              <Shield className="w-6 h-6 flex-shrink-0" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Thay đổi vai trò người dùng
              </h4>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Chuyển đổi vai trò của <strong>@{roleModal.user?.username}</strong> thành{' '}
              <strong className="text-purple-600 dark:text-purple-400 uppercase">{roleModal.targetRole}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setRoleModal({ isOpen: false, user: null, targetRole: 'user', loading: false })}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={roleModal.loading}
                onClick={handleConfirmRole}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
              >
                {roleModal.loading ? 'Đang cập nhật...' : 'Xác nhận đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đặt lại Mật khẩu (Reset Password) */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Đặt lại mật khẩu cho thành viên
                </h4>
                <p className="text-xs text-zinc-400">@{resetModal.user?.username} ({resetModal.user?.email})</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Bạn có thể tự nhập mật khẩu mới hoặc sử dụng mật khẩu được tạo ngẫu nhiên bên dưới. Khi hoàn tất, <strong className="text-rose-500">toàn bộ phiên đăng nhập hiện tại của người dùng này sẽ bị thu hồi ngay lập tức</strong> trên mọi thiết bị.
            </p>

            {resetModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetModal.error}</span>
              </div>
            )}

            {resetModal.successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetModal.successMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setResetModal(p => ({ ...p, password: generateRandomPassword() }))}
                  className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tạo ngẫu nhiên khác</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={resetModal.showPassword ? 'text' : 'password'}
                  required
                  value={resetModal.password}
                  onChange={(e) => setResetModal(p => ({ ...p, password: e.target.value, error: '' }))}
                  placeholder="Nhập ít nhất 6 ký tự..."
                  className="w-full pl-3 pr-20 py-2.5 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="absolute right-2 top-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition"
                    title="Sao chép mật khẩu"
                  >
                    {resetModal.copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetModal(p => ({ ...p, showPassword: !p.showPassword }))}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition"
                    title={resetModal.showPassword ? 'Ẩn' : 'Hiện'}
                  >
                    {resetModal.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {resetModal.copied && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Đã sao chép mật khẩu vào clipboard! Hãy gửi cho thành viên.</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setResetModal({ isOpen: false, user: null, password: '', showPassword: true, copied: false, loading: false, error: '', successMessage: '' })}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={resetModal.loading || !!resetModal.successMessage}
                onClick={handleConfirmResetPassword}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 disabled:opacity-50"
              >
                {resetModal.loading ? 'Đang đặt lại...' : 'Xác nhận đặt lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
