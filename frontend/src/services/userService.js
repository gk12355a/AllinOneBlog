import api from './api';

export const userService = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/admin/profile', data),
  getAdminStats: () => api.get('/admin/stats'),
  getHistory: () => api.get('/user/history'),
  addHistory: (postId) => api.post(`/user/history/${postId}`),
  clearHistory: () => api.delete('/user/history'),
  deleteHistoryItem: (postId) => api.delete(`/user/history/${postId}`),
  getLikes: () => api.get('/user/likes'),
  toggleLike: (postId) => api.post(`/user/likes/${postId}`),
  getBookmarks: () => api.get('/user/bookmarks'),
  addBookmark: (postId) => api.post(`/user/bookmarks/${postId}`),
  removeBookmark: (postId) => api.delete(`/user/bookmarks/${postId}`),
  // Admin User Management
  getAdminUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (userId, data) => api.put(`/admin/users/${userId}/status`, data),
  updateUserRole: (userId, data) => api.put(`/admin/users/${userId}/role`, data),
  resetUserPassword: (userId, data) => api.post(`/admin/users/${userId}/reset-password`, data),
  // 28-day Cycle Tracker
  verifyCyclePin: (data) => api.post('/admin/cycle/verify', data),
  getCycleData: () => api.get('/admin/cycle'),
  updateCycleData: (data) => api.put('/admin/cycle', data),
  // Audit Logs
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getAuditStats: () => api.get('/admin/audit-logs/stats'),
};

export default userService;
