import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SpotlightModal from './components/SpotlightModal';
import BackToTop from './components/BackToTop';

import Home from './pages/Home';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import SeriesList from './pages/SeriesList';
import SeriesDetail from './pages/SeriesDetail';
import Videos from './pages/Videos';
import Albums from './pages/Albums';
import AlbumDetail from './pages/AlbumDetail';
import Certificates from './pages/Certificates';
import MyLibrary from './pages/MyLibrary';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogDetail />} />
              <Route path="/series" element={<SeriesList />} />
              <Route path="/series/:slug" element={<SeriesDetail />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/library" element={<MyLibrary />} />
              <Route path="/my-library" element={<MyLibrary />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/album" element={<Albums />} />
              <Route path="/albums/:slug" element={<AlbumDetail />} />
              <Route path="/album/:slug" element={<AlbumDetail />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
          <Footer />
          <SpotlightModal />
          <BackToTop />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
