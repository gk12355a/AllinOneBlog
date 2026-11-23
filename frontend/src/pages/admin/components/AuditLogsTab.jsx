import React, { useState, useEffect } from 'react';
import { 
  History, Search, RefreshCw, CheckCircle2, AlertCircle, 
  ChevronLeft, ChevronRight, Laptop, Smartphone, Tablet, 
  HelpCircle, Copy, Check, Filter, Calendar
} from 'lucide-react';
import userService from '../../../services/userService';
import { useApp } from '../../../contexts/AppContext';
import PaginationControl from './PaginationControl';

export default function AuditLogsTab() {
  const { lang } = useApp();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedIp, setCopiedIp] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchLogs = async (currentPage = 1, currentLimit = pageSize) => {
    try {
      setLoading(true);
      const res = await userService.getAuditLogs({
        page: currentPage,
        per_page: currentLimit,
        feature: featureFilter,
        status: statusFilter,
        q: search
      });
      const data = res?.data || res;
      if (data?.items) {
        setLogs(data.items);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setTotalPages(data.total_pages || 1);
      }
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, pageSize);
  }, [page, pageSize, featureFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(''), 2000);
  };

  // Format tổng số bản ghi (ví dụ 177.45K nếu lớn hoặc 177.450)
  const formatTotal = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toLocaleString('vi-VN');
  };

  // Helper render device icon & badge
  const renderDeviceBadge = (deviceType, browserName, osName) => {
    let Icon = HelpCircle;
    let colorClass = 'text-zinc-500';

    switch (deviceType?.toLowerCase()) {
      case 'desktop':
        Icon = Laptop;
        colorClass = 'text-zinc-400';
        break;
      case 'mobile':
        Icon = Smartphone;
        colorClass = 'text-indigo-400';
        break;
      case 'tablet':
        Icon = Tablet;
        colorClass = 'text-amber-400';
        break;
      default:
        Icon = HelpCircle;
    }

    const label = [deviceType, osName, browserName].filter(Boolean).filter(x => x !== 'Unknown').join(' • ') || (deviceType || 'Unknown');

    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium" title={`Thiết bị: ${deviceType} | HĐH: ${osName} | Trình duyệt: ${browserName}`}>
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info - Thiết kế chuẩn theo mẫu của bạn */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Nhật ký hoạt động</span>
          </h2>
          <span className="text-sm font-semibold text-zinc-400 font-mono">
            {formatTotal(total)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          {lastUpdated && <span>cập nhật {lastUpdated}</span>}
          <button
            type="button"
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo hành động, người dùng, IP, lý do..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={featureFilter}
            onChange={(e) => { setFeatureFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả tính năng</option>
            <option value="Xác thực">Xác thực</option>
            <option value="Quản trị người dùng">Quản trị người dùng</option>
            <option value="Quản lý bài viết">Quản lý bài viết</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả kết quả</option>
            <option value="success">Thành công</option>
            <option value="failed">Thất bại</option>
          </select>
        </div>
      </form>

      {/* Audit Log Table - Thiết kế chính xác theo cấu trúc các cột trong ảnh mẫu */}
      <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-14 text-center">STT</th>
                <th className="py-3 px-4 min-w-[220px]">Hành động</th>
                <th className="py-3 px-3 w-28">Kết quả</th>
                <th className="py-3 px-3 w-32">Tính năng</th>
                <th className="py-3 px-3 w-32">Người dùng</th>
                <th className="py-3 px-4 min-w-[200px]">Lý do thất bại</th>
                <th className="py-3 px-3 w-36">Địa chỉ IP</th>
                <th className="py-3 px-4 w-40 text-right">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-zinc-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
                    <p>Đang tải nhật ký...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-zinc-400">
                    <History className="w-8 h-8 mx-auto stroke-1 mb-2 text-zinc-500" />
                    <p>Không có nhật ký hoạt động nào phù hợp.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const isSuccess = log.status === 'success';
                  const rowNumber = (page - 1) * 20 + index + 1;

                  return (
                    <tr key={log.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                      {/* STT */}
                      <td className="py-3 px-3 text-center text-zinc-400 font-mono">
                        {rowNumber}
                      </td>

                      {/* Hành động */}
                      <td className="py-3 px-4 text-zinc-800 dark:text-zinc-200 font-medium">
                        <span className="line-clamp-2" title={log.action}>
                          {log.action}
                        </span>
                      </td>

                      {/* Kết quả */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isSuccess
                            ? 'text-emerald-500 bg-emerald-500/10'
                            : 'text-rose-500 bg-rose-500/10'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{isSuccess ? 'Thành công' : 'Thất bại'}</span>
                        </span>
                      </td>

                      {/* Tính năng */}
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                        {log.feature}
                      </td>

                      {/* Người dùng */}
                      <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 font-mono">
                        {log.username || '-'}
                      </td>

                      {/* Lý do thất bại */}
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                        {log.failure_reason ? (
                          <span className="line-clamp-2 text-rose-400/90" title={log.failure_reason}>
                            {log.failure_reason}
                          </span>
                        ) : (
                          <span className="text-zinc-600 dark:text-zinc-600">-</span>
                        )}
                      </td>

                      {/* Địa chỉ IP & Thiết bị */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            <span>{log.ip_address || '127.0.0.1'}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(log.ip_address)}
                              className="text-zinc-500 hover:text-zinc-300 p-0.5"
                              title="Sao chép IP"
                            >
                              {copiedIp === log.ip_address ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <div>
                            {renderDeviceBadge(log.device_type, log.browser_name, log.os_name)}
                          </div>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3 px-4 text-right text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <PaginationControl
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel="nhật ký"
          itemLabelEn="logs"
        />
      </div>
    </div>
  );
}
