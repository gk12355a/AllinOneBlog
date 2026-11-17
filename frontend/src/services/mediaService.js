import api from './api';

export const mediaService = {
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
  createAlbum: (data) => api.post('/admin/albums', data),
  updateAlbum: (id, data) => api.put(`/admin/albums/${id}`, data),
  deleteAlbum: (id) => api.delete(`/admin/albums/${id}`),
  addPhotoToAlbum: (albumId, formData) => api.post(`/admin/albums/${albumId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deletePhoto: (photoId) => api.delete(`/admin/photos/${photoId}`),
};

export default mediaService;
