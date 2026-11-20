import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Image as ImageIcon,
  FolderGit2,
  Mail,
  RefreshCw,
  UserCheck,
  Layers,
  Camera,
  Video as VideoIcon,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { profileApi, postApi, mediaApi, contentApi, seriesApi } from '../../services/api';
import userService from '../../services/userService';
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
import VideosTab from './components/VideosTab';
import UsersTab from './components/UsersTab';
import AuditLogsTab from './components/AuditLogsTab';

export default function AdminDashboard() {
  const { user, t, lang } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định activeTab dựa trên search param "?tab=..." (Đồng bộ URL, F5 không mất tab)
  const searchParams = new URLSearchParams(location.search);
  const currentTabParam = searchParams.get('tab') || 'stats';
  const [activeTab, setActiveTab] = useState(currentTabParam);

  // Responsive Sidebar States
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Data states
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [albumsList, setAlbumsList] = useState([]);
  const [videosList, setVideosList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'stats';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
    setIsMobileOpen(false);
    navigate(`/admin?tab=${tabKey}`, { replace: true });
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login?redirect=/admin');
      return;
    }
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sRes, pRes, mRes, msgRes, projRes, profRes, seriesRes, albumsRes, vRes, uRes] = await Promise.all([
        profileApi.getAdminStats(),
        postApi.getAdminPosts(),
        mediaApi.getMediaList(),
        contentApi.getMessages(),
        contentApi.getProjects({ admin: true }),
        profileApi.getProfile(),
        seriesApi.getSeriesList(),
        mediaApi.getAlbums(),
        contentApi.getVideos({ admin: true }),
        userService.getAdminUsers()
      ]);

      const sData = sRes?.data || sRes;
      const pData = pRes?.data || pRes;
      const mData = mRes?.data || mRes;
      const msgData = msgRes?.data || msgRes;
      const projData = projRes?.data || projRes;
      const profData = profRes?.data || profRes;
      const seriesData = seriesRes?.data || seriesRes;
      const albumsData = albumsRes?.data || albumsRes;
      const vData = vRes?.data || vRes;
      const uData = uRes?.data || uRes;

      if (sData) setStats(sData);
      if (pData?.items) setPosts(pData.items);
      else if (Array.isArray(pData)) setPosts(pData);
      if (Array.isArray(mData)) setMediaList(mData);
      if (Array.isArray(msgData)) setMessages(msgData);
      if (Array.isArray(projData)) setProjects(projData);
      if (profData) setProfile(profData);
      if (Array.isArray(seriesData)) setSeriesList(seriesData);
      if (Array.isArray(albumsData)) setAlbumsList(albumsData);
      if (Array.isArray(vData)) setVideosList(vData);
      if (Array.isArray(uData)) setUsersList(uData);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const unreadMessagesCount = messages.filter((m) => !m.is_read).length;
  const lockedUsersCount = usersList.filter((u) => !u.is_active || u.is_locked).length;

  // Cấu hình Menu phân nhóm chuẩn Enterprise (Content, Portfolio, Community, System)
  const NAV_GROUPS = [
    {
      groupKey: 'overview',
      groupLabelVi: 'TỔNG QUAN',
      groupLabelEn: 'OVERVIEW',
      items: [
        { key: 'stats', label: t('admin.tab_overview') || 'Thống kê tổng quan', icon: BarChart3 }
      ]
    },
    {
      groupKey: 'content',
      groupLabelVi: 'NỘI DUNG',
      groupLabelEn: 'CONTENT',
      items: [
        { key: 'posts', label: t('admin.tab_posts') || 'Quản lý bài viết', icon: FileText, count: posts.length },
        { key: 'series', label: t('admin.tab_series') || 'Chuỗi bài & Lộ trình', icon: Layers, count: seriesList.length },
        { key: 'videos', label: t('admin.tab_videos') || 'Video Showcase', icon: VideoIcon, count: videosList.length },
        { key: 'albums', label: t('admin.tab_albums') || 'Albums Nhiếp ảnh', icon: Camera, count: albumsList.length },
        { key: 'media', label: t('admin.tab_media') || 'Media & Watermark', icon: ImageIcon, count: mediaList.length }
      ]
    },
    {
      groupKey: 'portfolio',
      groupLabelVi: 'PORTFOLIO',
      groupLabelEn: 'PORTFOLIO',
      items: [
        { key: 'profile', label: t('admin.tab_profile') || 'Hồ sơ & Trang chủ', icon: UserCheck },
        { key: 'projects', label: t('admin.tab_projects') || 'Dự án nổi bật', icon: FolderGit2, count: projects.length }
      ]
    },
    {
      groupKey: 'community',
      groupLabelVi: 'CỘNG ĐỒNG',
      groupLabelEn: 'COMMUNITY',
      items: [
        { 
          key: 'messages', 
          label: t('admin.tab_messages') || 'Tin nhắn liên hệ', 
          icon: Mail, 
          badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
          badgeColor: 'bg-amber-500 text-white'
        }
      ]
    },
    {
      groupKey: 'system',
      groupLabelVi: 'HỆ THỐNG',
      groupLabelEn: 'SYSTEM',
      items: [
        { 
          key: 'users', 
          label: t('admin.tab_users') || 'Quản lý Người dùng', 
          icon: Users,
          badge: lockedUsersCount > 0 ? `${lockedUsersCount} khóa` : null,
          badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        },
        { key: 'audit-logs', label: t('admin.tab_audit_logs') || 'Nhật ký hoạt động', icon: History }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-zinc-500">{t('loading') || 'Đang tải dữ liệu...'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950">
      
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] bg-white dark:bg-zinc-900/90 border-r border-zinc-200 dark:border-zinc-800/80 transition-all duration-300 flex flex-col
        ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-18' : 'md:w-64'}
      `}>
        {/* Sidebar Header & Collapse Toggle */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          {!isCollapsed ? (
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-2 truncate">
              {lang === 'vi' ? 'Menu Quản Trị' : 'Admin Navigation'}
            </span>
          ) : (
            <div className="w-full flex justify-center">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
            </div>
          )}
          
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-6 [scrollbar-width:thin]">
          {NAV_GROUPS.map((grp) => (
            <div key={grp.groupKey} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 mb-1.5 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  {lang === 'vi' ? grp.groupLabelVi : grp.groupLabelEn}
                </div>
              )}

              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectTab(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs border border-indigo-200 dark:border-indigo-800/40'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
                    }`} />
                    
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {item.badge ? (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-indigo-100 text-indigo-700'}`}>
                            {item.badge}
                          </span>
                        ) : item.count !== undefined ? (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {item.count}
                          </span>
                        ) : null}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Workspace Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        {/* Top Action Bar (Mobile Menu Trigger + Refresh Data) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
              title="Mở menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              {NAV_GROUPS.flatMap(g => g.items).find(i => i.key === activeTab)?.label || t('admin.dashboard_title')}
            </h1>
          </div>

          <button
            onClick={() => fetchAdminData(false)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('admin.refresh_data')}</span>
          </button>
        </div>

        {/* Dynamic Tab Workspace Panels */}
        <div className="space-y-6">
          {activeTab === 'stats' && <StatsTab stats={stats} />}

          {activeTab === 'profile' && (
            <ProfileTab initialProfile={profile} onProfileUpdated={(updated) => setProfile(updated)} />
          )}

          {activeTab === 'projects' && (
            <ProjectsTab projects={projects} onProjectsUpdated={() => fetchAdminData(true)} />
          )}

          {activeTab === 'series' && (
            <SeriesTab 
              allPosts={posts} 
              allVideos={videosList}
              onSeriesUpdated={() => fetchAdminData(true)} 
            />
          )}

          {activeTab === 'albums' && (
            <AlbumsTab albums={albumsList} onAlbumsUpdated={() => fetchAdminData(true)} />
          )}

          {activeTab === 'videos' && (
            <VideosTab 
              videos={videosList} 
              seriesList={seriesList} 
              posts={posts} 
              onRefresh={() => fetchAdminData(true)} 
            />
          )}

          {activeTab === 'users' && (
            <UsersTab 
              users={usersList} 
              currentUser={user} 
              onRefresh={() => fetchAdminData(true)} 
            />
          )}

          {activeTab === 'audit-logs' && (
            <AuditLogsTab />
          )}

          {activeTab === 'posts' && (
            <PostsTab posts={posts} onPostsUpdated={() => fetchAdminData(true)} />
          )}

          {activeTab === 'media' && (
            <MediaTab mediaList={mediaList} onMediaUpdated={() => fetchAdminData(true)} />
          )}

          {activeTab === 'messages' && (
            <MessagesTab messages={messages} onMessagesUpdated={() => fetchAdminData(true)} />
          )}
        </div>
      </main>
    </div>
  );
}
