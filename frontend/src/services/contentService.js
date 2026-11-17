import api from './api';

export const contentService = {
  getProjects: (params) => api.get('/projects', { params }),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
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

export default contentService;
