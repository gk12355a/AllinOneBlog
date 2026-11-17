import api from './api';

export const seriesService = {
  getSeriesList: () => api.get('/series'),
  getSeriesDetail: (slug) => api.get(`/series/${slug}`),
  createSeries: (data) => api.post('/admin/series', data),
  updateSeries: (id, data) => api.put(`/admin/series/${id}`, data),
  deleteSeries: (id) => api.delete(`/admin/series/${id}`),
  assignPostToSeries: (seriesId, data) => api.post(`/admin/series/${seriesId}/posts`, data),
  removePostFromSeries: (seriesId, postId) => api.delete(`/admin/series/${seriesId}/posts/${postId}`),
  reorderSeriesPosts: (seriesId, data) => api.put(`/admin/series/${seriesId}/reorder`, data),
};

export default seriesService;
