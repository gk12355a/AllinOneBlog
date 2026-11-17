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
};

export default userService;
