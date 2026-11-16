import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, FileText, Image as ImageIcon, FolderGit2, Video, Mail,
  Plus, Trash2, Edit3, CheckCircle, ExternalLink, RefreshCw, Upload, Eye
} from 'lucide-react';
import { profileApi, postApi, mediaApi, contentApi } from '../services/api';
import { useApp } from '../contexts/AppContext';

export default function AdminDashboard() {
  const { user, t } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [videos, setVideos] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newPost, setNewPost] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    thumbnail: '',
    language: 'vi',
    status: 'draft',
    tags: 'python, web'
  });
  const [editingPostId, setEditingPostId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewToken, setPreviewToken] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login?redirect=/admin');
      return;
    }
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, mRes, msgRes, projRes, vidRes, profRes] = await Promise.all([
        profileApi.getAdminStats(),
        postApi.getAdminPosts(),
        mediaApi.getMediaList(),
        contentApi.getMessages(),
        contentApi.getProjects(),
        contentApi.getVideos(),
        profileApi.getProfile()
      ]);

      const sData = sRes?.data || sRes;
      const pData = pRes?.data || pRes;
      const mData = mRes?.data || mRes;
      const msgData = msgRes?.data || msgRes;
      const projData = projRes?.data || projRes;
      const vidData = vidRes?.data || vidRes;
      const profData = profRes?.data || profRes;

      if (sData) setStats(sData);
      if (pData?.items) setPosts(pData.items);
      else if (Array.isArray(pData)) setPosts(pData);
      if (Array.isArray(mData)) setMediaList(mData);
      if (Array.isArray(msgData)) setMessages(msgData);
      if (Array.isArray(projData)) setProjects(projData);
      if (Array.isArray(vidData)) setVideos(vidData);
      if (profData) setProfile(profData);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Post Actions
  const handleSavePost = async (e) => {
    e.preventDefault();
    const payload = {
      ...newPost,
      tags: typeof newPost.tags === 'string' ? newPost.tags.split(',').map(s => s.trim()).filter(Boolean) : newPost.tags
    };

    try {
      if (editingPostId) {
        await postApi.updatePost(editingPostId, payload);
      } else {
        await postApi.createPost(payload);
      }
      setEditingPostId(null);
      setNewPost({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        thumbnail: '',
        language: 'vi',
        status: 'draft',
        tags: 'python, web'
      });
      const pRes = await postApi.getAdminPosts();
      const pData = pRes?.data || pRes;
      if (Array.isArray(pData)) setPosts(pData);
      else if (pData?.items) setPosts(pData.items);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving post');
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await postApi.deletePost(id);
      setPosts(posts.filter(p => p.id !== id));
    } catch (err) {
      alert('Error deleting post');
    }
  };

  const handleGeneratePreview = async (slug) => {
    try {
      const res = await postApi.getPreviewToken(slug);
      const data = res?.data || res;
      const token = data?.preview_token || data?.token;
      if (token) {
        setPreviewToken({ slug, token });
        // Mở luôn tab mới xem trước cho tiện lợi
        window.open(`/blog/${slug}?preview=${token}`, '_blank');
      } else {
        alert('Failed to extract preview token');
      }
    } catch (err) {
      alert('Failed to generate preview token');
    }
  };

  // Media Actions
  const handleUploadMedia = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await mediaApi.upload(formData);
      if (res.data?.success) {
        setUploadFile(null);
        const mRes = await mediaApi.getMediaList();
        if (mRes.data?.success) setMediaList(mRes.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await mediaApi.deleteMedia(id);
      setMediaList(mediaList.filter(m => m.id !== id));
    } catch (err) {
      alert('Error deleting media');
    }
  };

  // Message Actions
  const handleMarkMessageRead = async (id) => {
    try {
      await contentApi.markMessageRead(id);
      setMessages(messages.map(m => m.id === id ? { ...m, is_read: true } : m));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">{t('admin_dashboard')}</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage content, media, projects, messages, and portfolio profile.</p>
        </div>
        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 space-x-6 mb-8 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'stats' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Overview Stats
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'posts' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Posts Manager ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'media' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Media & Watermark ({mediaList.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'messages' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          Messages ({messages.filter(m => !m.is_read).length} unread)
        </button>
      </div>

      {/* Overview Stats */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Views</span>
              <p className="text-3xl font-extrabold mt-2 text-indigo-600 dark:text-indigo-400">{stats.total_views}</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Published Posts</span>
              <p className="text-3xl font-extrabold mt-2 text-zinc-900 dark:text-zinc-100">{stats.total_posts}</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Projects / Videos</span>
              <p className="text-3xl font-extrabold mt-2 text-zinc-900 dark:text-zinc-100">{stats.total_projects} / {stats.total_videos}</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unread Messages</span>
              <p className="text-3xl font-extrabold mt-2 text-amber-500">{stats.unread_messages}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="text-base font-bold mb-4">Top Viewed Posts</h3>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {stats.top_posts?.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate pr-4">{p.title}</span>
                  <span className="text-xs font-semibold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 shrink-0">
                    {p.views} views
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Posts Manager */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">All Posts</h2>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
              {posts.map((post) => (
                <div key={post.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        post.status === 'published' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {post.status}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-zinc-400">{post.language}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{post.title}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">/{post.slug} • {post.views} views</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {post.status === 'draft' && (
                      <button
                        onClick={() => handleGeneratePreview(post.slug)}
                        title="Generate Preview Token"
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingPostId(post.id);
                        setNewPost({
                          title: post.title,
                          slug: post.slug,
                          excerpt: post.excerpt || '',
                          content: post.content || '',
                          thumbnail: post.thumbnail || '',
                          language: post.language || 'vi',
                          status: post.status || 'draft',
                          tags: post.tags?.join(', ') || ''
                        });
                      }}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {previewToken && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl">
                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">Draft Preview URL (Valid for 1 hour):</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/blog/${previewToken.slug}?preview=${previewToken.token}`}
                    className="w-full text-xs font-mono p-2 rounded bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900"
                  />
                  <a
                    href={`/blog/${previewToken.slug}?preview=${previewToken.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-indigo-600 text-white rounded text-xs font-semibold whitespace-nowrap"
                  >
                    Open
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              {editingPostId ? 'Edit Post' : 'Create New Post'}
            </h2>
            <form onSubmit={handleSavePost} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Slug (leave empty to auto-generate)</label>
                <input
                  type="text"
                  value={newPost.slug}
                  onChange={(e) => setNewPost({ ...newPost, slug: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Language</label>
                  <select
                    value={newPost.language}
                    onChange={(e) => setNewPost({ ...newPost, language: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Status</label>
                  <select
                    value={newPost.status}
                    onChange={(e) => setNewPost({ ...newPost, status: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Thumbnail URL</label>
                <input
                  type="text"
                  value={newPost.thumbnail}
                  onChange={(e) => setNewPost({ ...newPost, thumbnail: e.target.value })}
                  placeholder="https://..."
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newPost.tags}
                  onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                  placeholder="react, python, security"
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Excerpt</label>
                <textarea
                  rows={2}
                  value={newPost.excerpt}
                  onChange={(e) => setNewPost({ ...newPost, excerpt: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Markdown Content</label>
                <textarea
                  rows={6}
                  required
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  {editingPostId ? 'Update Post' : 'Create Post'}
                </button>
                {editingPostId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPostId(null);
                      setNewPost({
                        title: '',
                        slug: '',
                        excerpt: '',
                        content: '',
                        thumbnail: '',
                        language: 'vi',
                        status: 'draft',
                        tags: 'python, web'
                      });
                    }}
                    className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Manager */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <h3 className="text-base font-bold mb-2">Upload Image with Auto Watermark (© allinoneblog.dev)</h3>
            <p className="text-xs text-zinc-500 mb-4">Images are watermarked and sanitized to prevent malicious uploads.</p>
            <form onSubmit={handleUploadMedia} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:bg-zinc-200"
              />
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Processing...' : 'Upload & Watermark'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mediaList.map((m) => (
              <div key={m.id} className="group relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <img src={m.url} alt={m.filename} className="w-full h-36 object-cover" />
                <div className="p-2">
                  <p className="text-[11px] font-medium truncate text-zinc-700 dark:text-zinc-300">{m.filename}</p>
                  <p className="text-[10px] text-zinc-400">{(m.file_size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => handleDeleteMedia(m.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition"
                  title="Delete media"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Contact Inquiries</h2>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
            {messages.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">No contact messages yet.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${m.is_read ? 'opacity-70' : 'bg-indigo-50/20 dark:bg-indigo-950/10'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{m.sender_name}</span>
                      <span className="text-xs text-zinc-400">&lt;{m.sender_email}&gt;</span>
                      {!m.is_read && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">NEW</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">{m.message}</p>
                    <span className="text-[10px] text-zinc-400 mt-1 block">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  {!m.is_read && (
                    <button
                      onClick={() => handleMarkMessageRead(m.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
