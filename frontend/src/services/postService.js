import api from './api';

export const postService = {
  getPosts: (params) => api.get('/posts', { params }),
  getAdminPosts: () => api.get('/admin/posts'),
  getAdminPostById: (id) => api.get(`/admin/posts/${id}`),
  getPost: (slug, params) => api.get(`/posts/${slug}`, { params }),
  getPostPreview: (slug, token) => api.get(`/posts/${slug}/preview`, { params: { token } }),
  getRelatedPosts: (slug) => api.get(`/posts/${slug}/related`),
  reactPost: (slug, data) => api.post(`/posts/${slug}/reactions`, data),
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

export default postService;
