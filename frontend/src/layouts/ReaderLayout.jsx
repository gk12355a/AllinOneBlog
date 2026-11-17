import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SpotlightModal from '../components/SpotlightModal';
import BackToTop from '../components/BackToTop';

export default function ReaderLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6">
        <Outlet />
      </main>
      <Footer />
      <SpotlightModal />
      <BackToTop />
    </div>
  );
}
