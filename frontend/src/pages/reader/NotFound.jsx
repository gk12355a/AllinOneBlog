import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft, LogIn } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function NotFound() {
  const { user, lang, t } = useApp();
  const location = useLocation();

  // Lưu đường dẫn hiện tại làm returnTo để sau khi đăng nhập có thể quay lại
  const returnTo = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 animate-fade-in">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-zinc-900/60 p-8 sm:p-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-sm">
        {/* 404 Illustration Icon */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
          <FileQuestion className="w-12 h-12 stroke-[1.5]" />
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold text-xs shadow-md">
            404
          </span>
        </div>

        {/* Title & Desc */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {lang === 'vi' ? 'Không tìm thấy trang' : 'Page Not Found'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {lang === 'vi' 
              ? 'Nội dung hoặc bài viết bạn đang tìm không tồn tại, đã bị gỡ bỏ hoặc bạn chưa được cấp quyền truy cập.'
              : 'The page or article you are looking for does not exist, has been removed, or you do not have permission.'}
          </p>
        </div>

        {/* Helpful Tip for Stealth Mode: Prompt login with returnTo */}
        {!user && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-left space-y-2">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              💡 {lang === 'vi' 
                ? 'Nếu bạn được cấp quyền riêng để đọc nội dung này, vui lòng đăng nhập tài khoản để xác thực.'
                : 'If you have been granted private access to this content, please log in to authenticate.'}
            </p>
            <Link
              to={`/login?redirect=${returnTo}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Đăng nhập ngay' : 'Log in now'}</span>
            </Link>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all hover:scale-105 inline-flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Về Trang chủ' : 'Back to Home'}</span>
          </Link>
          <Link
            to="/blog"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Xem tất cả bài viết' : 'Explore Articles'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
