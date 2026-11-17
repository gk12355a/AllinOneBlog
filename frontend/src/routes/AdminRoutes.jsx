import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/admin/Dashboard';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="dashboard" element={<Dashboard />} />
      {/* Extension points for sub-routes if split into individual pages */}
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}
