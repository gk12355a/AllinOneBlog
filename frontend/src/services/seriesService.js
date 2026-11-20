import api from './api';

export const seriesService = {
  getSeriesList: () => api.get('/series'),
  getSeriesDetail: (slug) => api.get(`/series/${slug}`),
  createSeries: (data) => api.post('/admin/series', data),
  updateSeries: (id, data) => api.put(`/admin/series/${id}`, data),
  deleteSeries: (id) => api.delete(`/admin/series/${id}`),
  
  // Mixed Series Items (Posts, Videos, Placeholders)
  addItem: (seriesId, data) => api.post(`/admin/series/${seriesId}/items`, data),
  removeItem: (seriesId, itemId) => api.delete(`/admin/series/${seriesId}/items/${itemId}`),
  reorderItems: (seriesId, items) => api.put(`/admin/series/${seriesId}/items/reorder`, { items }),

  // Progress Tracking
  getProgress: (seriesId) => api.get(`/series/${seriesId}/progress`),
  toggleProgress: (seriesId, itemId) => api.post(`/series/${seriesId}/progress/${itemId}/toggle`),

  // Legacy wrappers for backwards compatibility
  assignPostToSeries: (seriesId, data) => api.post(`/admin/series/${seriesId}/posts`, data),
  removePostFromSeries: (seriesId, postId) => api.delete(`/admin/series/${seriesId}/posts/${postId}`),
  reorderSeriesPosts: (seriesId, data) => api.put(`/admin/series/${seriesId}/reorder`, data),
};

export default seriesService;
