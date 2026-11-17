import api from './api';

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  updateSettings: (data) => api.put('/auth/settings', data),
  exportData: () => api.post('/auth/export-data'),
  deleteAccount: (data) => api.post('/auth/delete-account', data),
};

export default authService;
