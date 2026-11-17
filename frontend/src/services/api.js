import axios from 'axios';
import { authService } from './authService';
import { postService } from './postService';
import { userService } from './userService';
import { mediaService } from './mediaService';
import { contentService } from './contentService';
import { seriesService } from './seriesService';
import { categoryService } from './categoryService';

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

// Backward compatibility exports
export {
  authService,
  postService,
  userService,
  mediaService,
  contentService,
  seriesService,
  categoryService,
  authService as authApi,
  userService as profileApi,
  postService as postApi,
  userService as userLibraryApi,
  seriesService as seriesApi,
  mediaService as mediaApi,
  contentService as contentApi,
};

export default api;
