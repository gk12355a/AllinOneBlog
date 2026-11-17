import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Image as ImageIcon,
  FolderGit2,
  Mail,
  RefreshCw,
  UserCheck,
  Layers,
  Camera
} from 'lucide-react';
import { profileApi, postApi, mediaApi, contentApi, seriesApi } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

// Tab Components
import StatsTab from './components/StatsTab';
import ProfileTab from './components/ProfileTab';
import ProjectsTab from './components/ProjectsTab';
import SeriesTab from './components/SeriesTab';
import AlbumsTab from './components/AlbumsTab';
import PostsTab from './components/PostsTab';
import MediaTab from './components/MediaTab';
import MessagesTab from './components/MessagesTab';

export default function AdminDashboard() {
  const { user, t } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [albumsList, setAlbumsList] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const [sRes, pRes, mRes, msgRes, projRes, profRes, seriesRes, albumsRes] = await Promise.all([
        profileApi.getAdminStats(),
        postApi.getAdminPosts(),
        mediaApi.getMediaList(),
        contentApi.getMessages(),
        contentApi.getProjects({ admin: true }),
        profileApi.getProfile(),
        seriesApi.getSeriesList(),
        mediaApi.getAlbums()
      ]);

      const sData = sRes?.data || sRes;
      const pData = pRes?.data || pRes;
      const mData = mRes?.data || mRes;
      const msgData = msgRes?.data || msgRes;
      const projData = projRes?.data || projRes;
      const profData = profRes?.data || profRes;
      const seriesData = seriesRes?.data || seriesRes;
      const albumsData = albumsRes?.data || albumsRes;

      if (sData) setStats(sData);
      if (pData?.items) setPosts(pData.items);
      else if (Array.isArray(pData)) setPosts(pData);
      if (Array.isArray(mData)) setMediaList(mData);
      if (Array.isArray(msgData)) setMessages(msgData);
      if (Array.isArray(projData)) setProjects(projData);
      if (profData) setProfile(profData);
      if (Array.isArray(seriesData)) setSeriesList(seriesData);
      if (Array.isArray(albumsData)) setAlbumsList(albumsData);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
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

  const unreadMessagesCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('admin.dashboard_title')}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{t('admin.dashboard_subtitle')}</p>
        </div>
        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('admin.refresh_data')}
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 mb-8 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'stats'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {t('admin.tab_overview')}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          {t('admin.tab_profile')}
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'projects'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          {t('admin.tab_projects')} ({projects.length})
        </button>

        <button
          onClick={() => setActiveTab('series')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'series'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          {t('admin.tab_series')} ({seriesList.length})
        </button>

        <button
          onClick={() => setActiveTab('albums')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'albums'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          {t('admin.tab_albums')} ({albumsList.length})
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'posts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          {t('admin.tab_posts')} ({posts.length})
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'media'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          {t('admin.tab_media')} ({mediaList.length})
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'messages'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          {t('admin.tab_messages')} ({unreadMessagesCount} unread)
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'stats' && <StatsTab stats={stats} />}

      {activeTab === 'profile' && (
        <ProfileTab initialProfile={profile} onProfileUpdated={(updated) => setProfile(updated)} />
      )}

      {activeTab === 'projects' && (
        <ProjectsTab projects={projects} onProjectsUpdated={fetchAdminData} />
      )}

      {activeTab === 'series' && (
        <SeriesTab onSeriesUpdated={fetchAdminData} />
      )}

      {activeTab === 'albums' && (
        <AlbumsTab albums={albumsList} onAlbumsUpdated={fetchAdminData} />
      )}

      {activeTab === 'posts' && (
        <PostsTab posts={posts} onPostsUpdated={fetchAdminData} />
      )}

      {activeTab === 'media' && (
        <MediaTab mediaList={mediaList} onMediaUpdated={fetchAdminData} />
      )}

      {activeTab === 'messages' && (
        <MessagesTab messages={messages} onMessagesUpdated={fetchAdminData} />
      )}
    </div>
  );
}
