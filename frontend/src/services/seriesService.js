import api from './api';

export const seriesService = {
  getSeriesList: () => api.get('/series'),
  getSeriesDetail: (slug) => api.get(`/series/${slug}`),
  createSeries: (data) => api.post('/admin/series', data),
  updateSeries: (id, data) => api.put(`/admin/series/${id}`, data),
  deleteSeries: (id) => api.delete(`/admin/series/${id}`),
};

export default seriesService;
