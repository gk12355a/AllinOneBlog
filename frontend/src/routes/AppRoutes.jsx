import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ReaderLayout from '../layouts/ReaderLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminRoutes from './AdminRoutes';

// Reader pages
import Home from '../pages/reader/Home';
import BlogList from '../pages/reader/BlogList';
import BlogDetail from '../pages/reader/BlogDetail';
import SeriesList from '../pages/reader/SeriesList';
import SeriesDetail from '../pages/reader/SeriesDetail';
import Videos from '../pages/reader/Videos';
import VideoDetail from '../pages/reader/VideoDetail';
import Albums from '../pages/reader/Albums';
import AlbumDetail from '../pages/reader/AlbumDetail';
import Certificates from '../pages/reader/Certificates';
import MyLibrary from '../pages/reader/MyLibrary';
import Settings from '../pages/reader/Settings';
import Login from '../pages/reader/Login';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Reader Layout for Public & Reader Pages */}
      <Route element={<ReaderLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/series" element={<SeriesList />} />
        <Route path="/series/:slug" element={<SeriesDetail />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/videos/:slug" element={<VideoDetail />} />
        <Route path="/library" element={<MyLibrary />} />
        <Route path="/my-library" element={<MyLibrary />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/:section" element={<Settings />} />
        <Route path="/albums" element={<Albums />} />
        <Route path="/album" element={<Albums />} />
        <Route path="/albums/:slug" element={<AlbumDetail />} />
        <Route path="/album/:slug" element={<AlbumDetail />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Admin Layout & Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route path="*" element={<AdminRoutes />} />
        </Route>
      </Route>
    </Routes>
  );
}
