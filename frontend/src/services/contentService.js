import api from './api';

export const contentService = {
  getProjects: (params) => api.get('/projects', { params }),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  getVideos: (params) => api.get('/videos', { params }),
  getVideo: (slugOrId) => api.get(`/videos/${slugOrId}`),
  createVideo: (data) => api.post('/videos', data),
  updateVideo: (id, data) => api.put(`/videos/${id}`, data),
  deleteVideo: (id) => api.delete(`/videos/${id}`),
  incrementVideoView: (id) => api.post(`/videos/${id}/view`),
  getCertificates: () => api.get('/certificates'),
  getCertificateDetail: (id) => api.get(`/certificates/${id}`),
  createCertificate: (data) => api.post('/certificates', data),
  updateCertificate: (id, data) => api.put(`/certificates/${id}`, data),
  deleteCertificate: (id) => api.delete(`/certificates/${id}`),
  sendMessage: (data) => api.post('/contact', data),
  getMessages: (params) => api.get('/admin/messages', { params }),
  updateMessageStatus: (id, data) => api.put(`/admin/messages/${id}/status`, data),
  markMessageRead: (id) => api.put(`/admin/messages/${id}/read`),
  replyMessage: (id, data) => api.post(`/admin/messages/${id}/reply`, data),
  deleteMessage: (id) => api.delete(`/admin/messages/${id}`),
  // User Inbox
  getUserMessages: () => api.get('/user/messages'),
  userReplyMessage: (id, data) => api.post(`/user/messages/${id}/reply`, data),
  userDeleteMessage: (id) => api.delete(`/user/messages/${id}`),
  uploadChatAttachment: (formData) => api.post('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkMessageAction: (data) => api.post('/admin/messages/bulk', data),
  spotlightSearch: (q) => api.get('/search', { params: { q } }),
};

export default contentService;
