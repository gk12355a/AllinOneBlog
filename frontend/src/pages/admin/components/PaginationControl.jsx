import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';

/**
 * Reusable PaginationControl Component cho tất cả các Tab Quản Trị
 * Hỗ trợ:
 * - Chọn số dòng / phần tử trên mỗi trang (pageSize: 5, 10, 20, 50)
 * - Hiển thị dải số trang, dấu ba chấm `...`
 * - Nút nhảy Trang đầu, Trang trước, Trang sau, Trang cuối
 * - Thống kê "Hiển thị X - Y / Z mục"
 */
export default function PaginationControl({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  itemLabel = 'mục',
  itemLabelEn = 'items',
  className = ''
}) {
  const { lang } = useApp();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(validCurrentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className={`p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400 rounded-b-2xl ${className}`}>
      {/* Thống kê và chọn số dòng */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {lang === 'vi' ? 'Hiển thị' : 'Showing'}{' '}
          <strong className="text-zinc-900 dark:text-zinc-100">{startIndex}</strong> -{' '}
          <strong className="text-zinc-900 dark:text-zinc-100">{endIndex}</strong> /{' '}
          <strong className="text-zinc-900 dark:text-zinc-100">{totalItems}</strong>{' '}
          {lang === 'vi' ? itemLabel : itemLabelEn}
        </span>

        {/* Dropdown tùy chọn số dòng/trang */}
        <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-zinc-200 dark:border-zinc-700">
          <span className="text-[11px] text-zinc-400">{lang === 'vi' ? 'Số dòng:' : 'Rows:'}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              if (onPageSizeChange) onPageSizeChange(Number(e.target.value));
            }}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / {lang === 'vi' ? 'trang' : 'page'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Điều hướng chuyển trang */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(1)}
          disabled={validCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          title={lang === 'vi' ? 'Trang đầu tiên' : 'First page'}
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange && onPageChange(Math.max(validCurrentPage - 1, 1))}
          disabled={validCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          title={lang === 'vi' ? 'Trang trước' : 'Previous page'}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Các số trang hiển thị */}
        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
            .map((p, idx, arr) => {
              const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && <span className="px-1 text-zinc-400">...</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange && onPageChange(p)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg font-semibold text-xs transition ${
                      validCurrentPage === p
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange && onPageChange(Math.min(validCurrentPage + 1, totalPages))}
          disabled={validCurrentPage >= totalPages}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          title={lang === 'vi' ? 'Trang kế tiếp' : 'Next page'}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange && onPageChange(totalPages)}
          disabled={validCurrentPage >= totalPages}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          title={lang === 'vi' ? 'Trang cuối cùng' : 'Last page'}
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
