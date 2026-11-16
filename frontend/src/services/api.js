import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gắn JWT token tự động vào Authorization header nếu có
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý lỗi tập trung
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Hết hạn hoặc sai token -> Xóa token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Modular API services wrapping the base api client
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const profileApi = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/admin/profile', data),
  getAdminStats: () => api.get('/admin/stats'),
};

export const postApi = {
  getPosts: (params) => api.get('/posts', { params }),
  getAdminPosts: () => api.get('/admin/posts'),
  getPost: (slug, params) => api.get(`/posts/${slug}`, { params }),
  getRelatedPosts: (slug) => api.get(`/posts/${slug}/related`),
  reactPost: (slug, emoji) => api.post(`/posts/${slug}/reactions`, { emoji }),
  getTags: () => api.get('/tags'),
  getPreviewToken: (slug) => api.post(`/admin/posts/${slug}/preview-token`),
  createPost: (data) => api.post('/admin/posts', data),
  updatePost: (id, data) => api.put(`/admin/posts/${id}`, data),
  deletePost: (id) => api.delete(`/admin/posts/${id}`),
  // Comment APIs
  getComments: (slug) => api.get(`/posts/${slug}/comments`),
  addComment: (slug, content, parentId = null) => api.post(`/posts/${slug}/comments`, { content, parent_id: parentId }),
  editComment: (id, content) => api.put(`/comments/${id}`, { content }),
  deleteComment: (id) => api.delete(`/comments/${id}`),
};

export const userLibraryApi = {
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

export const seriesApi = {
  getSeriesList: () => api.get('/series'),
  getSeriesDetail: (slug) => api.get(`/series/${slug}`),
};

export const mediaApi = {
  upload: (formData) => api.post('/admin/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadUserImage: (formData) => api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMediaList: () => api.get('/admin/media'),
  deleteMedia: (id) => api.delete(`/admin/media/${id}`),
  getAlbums: () => api.get('/albums'),
  getAlbum: (slug) => api.get(`/albums/${slug}`),
};

export const contentApi = {
  getProjects: () => api.get('/projects'),
  getVideos: () => api.get('/videos'),
  getCertificates: () => api.get('/certificates'),
  getCertificateDetail: (id) => api.get(`/certificates/${id}`),
  createCertificate: (data) => api.post('/admin/certificates', data),
  updateCertificate: (id, data) => api.put(`/admin/certificates/${id}`, data),
  deleteCertificate: (id) => api.delete(`/admin/certificates/${id}`),
  sendMessage: (data) => api.post('/contact', data),
  getMessages: () => api.get('/admin/messages'),
  markMessageRead: (id) => api.put(`/admin/messages/${id}/read`),
  spotlightSearch: (q) => api.get('/search', { params: { q } }),
};

export default api;
