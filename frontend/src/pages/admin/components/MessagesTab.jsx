import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, Mail, Trash2, Search, X, Clock, User, 
  ExternalLink, Eye, AlertCircle, Sparkles, Inbox, RefreshCw,
  Star, Send, ShieldAlert, Archive, MessageSquare, CornerDownRight, Tag,
  FileText, CheckSquare, Square, ChevronRight, Lock, Unlock, Paperclip,
  Check, Info, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { contentApi } from '../../../services/api';
import { useApp } from '../../../contexts/AppContext';
import { getSocket } from '../../../services/socketService';

// Mẫu trả lời nhanh (Canned replies)
const CANNED_REPLIES = [
  {
    title: 'Cảm ơn & Tiếp nhận',
    text: 'Chào bạn,\nCảm ơn bạn đã gửi liên hệ cho chúng tôi! Chúng tôi đã tiếp nhận thông tin và đang tiến hành kiểm tra/xử lý yêu cầu của bạn.'
  },
  {
    title: 'Hẹn lịch trao đổi hợp tác',
    text: 'Chào bạn,\nCảm ơn bạn đã quan tâm hợp tác. Dự án của bạn rất thú vị! Bạn có thể sắp xếp một buổi trao đổi ngắn qua Google Meet trong tuần này được không?'
  },
  {
    title: 'Đã khắc phục lỗi kỹ thuật',
    text: 'Chào bạn,\nVấn đề bạn báo cáo đã được đội ngũ kỹ thuật kiểm tra và khắc phục xong. Bạn vui lòng làm mới trang (Ctrl+F5) và thử lại giúp mình nhé.'
  },
  {
    title: 'Đóng hội thoại hỗ trợ',
    text: 'Chào bạn,\nVì vấn đề đã được giải đáp đầy đủ, mình xin phép đóng cuộc trao đổi này. Nếu có bất kỳ câu hỏi nào khác, bạn có thể gửi phản hồi tiếp bất cứ lúc nào!'
  }
];

export default function MessagesTab({ messages = [], onMessagesUpdated }) {
  const { t, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bộ lọc
  const [filterType, setFilterType] = useState('all'); // 'all' | 'waiting_me' | 'waiting_user' | 'resolved' | 'starred' | 'unassigned' | 'spam'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest_unreplied'

  // Tin nhắn đang chọn trên cột phải
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Thao tác hàng loạt (Bulk selection)
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Soạn tin trả lời & ghi chú nội bộ
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [closeAfterReply, setCloseAfterReply] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showCannedDropdown, setShowCannedDropdown] = useState(false);

  const chatBottomRef = useRef(null);

  // Tự động chọn tin nhắn đầu tiên khi có danh sách hoặc giữ tin hiện tại
  useEffect(() => {
    if (messages.length > 0 && !selectedMessage) {
      handleSelectMessage(messages[0]);
    } else if (selectedMessage) {
      const updated = messages.find(m => m.id === selectedMessage.id);
      if (updated) setSelectedMessage(updated);
    }
  }, [messages]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessage?.replies]);

  // Lắng nghe sự kiện thời gian thực (WebSocket) với Room bảo mật & Auto-refresh dự phòng
  useEffect(() => {
    const socket = getSocket();
    const token = localStorage.getItem('token');

    if (selectedMessage?.id) {
      socket.emit('conversation:join', { id: selectedMessage.id, token });
    }

    const handleMessageUpdated = (payload) => {
      const updatedMsg = payload?.data || payload;
      if (selectedMessage && selectedMessage.id === updatedMsg.id) {
        setSelectedMessage(updatedMsg);
      }
      if (onMessagesUpdated) onMessagesUpdated();
    };

    const handleInboxChanged = (payload) => {
      if (onMessagesUpdated) onMessagesUpdated();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && onMessagesUpdated) {
        onMessagesUpdated();
      }
    };

    socket.on('message:new', handleMessageUpdated);
    socket.on('inbox:changed', handleInboxChanged);
    socket.on('connect', () => {
      if (onMessagesUpdated) onMessagesUpdated();
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling dự phòng thưa (mỗi 10s)
    const fallbackInterval = setInterval(() => {
      if (onMessagesUpdated) onMessagesUpdated();
    }, 10000);

    return () => {
      if (selectedMessage?.id) {
        socket.emit('conversation:leave', { id: selectedMessage.id });
      }
      socket.off('message:new', handleMessageUpdated);
      socket.off('inbox:changed', handleInboxChanged);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(fallbackInterval);
    };
  }, [selectedMessage?.id, onMessagesUpdated]);

  // Chọn tin nhắn & tự động đánh dấu đã đọc
  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    setReplyText('');
    setIsInternalNote(false);
    if (!msg.is_read || msg.status === 'new') {
      try {
        await contentApi.updateMessageStatus(msg.id, { is_read: true, status: 'read' });
        setSelectedMessage(prev => ({ ...prev, is_read: true, status: 'read' }));
        if (onMessagesUpdated) onMessagesUpdated();
      } catch (err) {
        console.error('Lỗi khi đánh dấu đã đọc:', err);
      }
    }
  };

  // Toggle gắn sao
  const handleToggleStar = async (msg, e) => {
    if (e) e.stopPropagation();
    try {
      const nextStar = !msg.is_starred;
      await contentApi.updateMessageStatus(msg.id, { is_starred: nextStar });
      showToast(nextStar ? 'Đã ghim tin nhắn quan trọng!' : 'Đã bỏ ghim tin nhắn!');
      if (selectedMessage && selectedMessage.id === msg.id) {
        setSelectedMessage(prev => ({ ...prev, is_starred: nextStar }));
      }
      if (onMessagesUpdated) onMessagesUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Đóng / Mở lại hội thoại
  const handleToggleClose = async (msg, e) => {
    if (e) e.stopPropagation();
    const willClose = !msg.is_closed;
    try {
      await contentApi.updateMessageStatus(msg.id, { 
        is_closed: willClose,
        status: willClose ? 'closed' : 'read'
      });
      showToast(willClose ? 'Đã đóng hội thoại thành công!' : 'Đã mở lại hội thoại!');
      if (selectedMessage && selectedMessage.id === msg.id) {
        setSelectedMessage(prev => ({ 
          ...prev, 
          is_closed: willClose, 
          status: willClose ? 'closed' : 'read' 
        }));
      }
      if (onMessagesUpdated) onMessagesUpdated();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái đóng/mở.');
    }
  };

  // Xóa tin nhắn
  const handleDeleteMessage = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa hội thoại liên hệ này không?')) return;
    try {
      await contentApi.deleteMessage(id);
      showToast('Đã xóa hội thoại thành công!');
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }
      if (onMessagesUpdated) onMessagesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi xóa tin nhắn');
    }
  };

  // Gửi trả lời hoặc ghi chú nội bộ
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    setIsSubmittingReply(true);
    try {
      const res = await contentApi.replyMessage(selectedMessage.id, {
        reply_content: replyText.trim(),
        is_internal: isInternalNote,
        close_after_reply: closeAfterReply
      });
      const updated = res?.data || res;
      showToast(isInternalNote ? 'Đã lưu ghi chú nội bộ!' : 'Đã gửi phản hồi đến người dùng!');
      setSelectedMessage(updated);
      setReplyText('');
      setIsInternalNote(false);
      setCloseAfterReply(false);
      if (onMessagesUpdated) onMessagesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi gửi phản hồi');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Thao tác hàng loạt (Bulk actions)
  const handleSelectAll = () => {
    if (selectedIds.length === filteredMessages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMessages.map(m => m.id));
    }
  };

  const handleToggleSelectId = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;
    if (action === 'delete' && !window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} tin nhắn đã chọn?`)) return;

    setIsBulkProcessing(true);
    try {
      await contentApi.bulkMessageAction({ ids: selectedIds, action });
      showToast(`Đã áp dụng thao tác thành công cho ${selectedIds.length} tin nhắn!`);
      setSelectedIds([]);
      if (onMessagesUpdated) onMessagesUpdated();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi thao tác hàng loạt');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Tính toán SLA: Số ngày từ khi gửi hoặc chưa phản hồi
  const getSlaBadge = (msg) => {
    if (msg.is_closed || msg.status === 'replied') return null;
    if (!msg.created_at) return null;

    const created = new Date(msg.created_at);
    const now = new Date();
    const diffHours = (now - created) / (1000 * 60 * 60);

    if (diffHours >= 48) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
          <AlertTriangle className="w-3 h-3" />
          <span>SLA Quá hạn (2d+)</span>
        </span>
      );
    }
    if (diffHours >= 24) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
          <Clock className="w-3 h-3" />
          <span>Chờ 1 ngày</span>
        </span>
      );
    }
    return null;
  };

  // Lọc tin nhắn
  const filteredMessages = messages.filter(msg => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      (msg.name && msg.name.toLowerCase().includes(q)) ||
      (msg.email && msg.email.toLowerCase().includes(q)) ||
      (msg.subject && msg.subject.toLowerCase().includes(q)) ||
      (msg.message && msg.message.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && msg.category !== categoryFilter) return false;

    if (filterType === 'waiting_me') return !msg.is_closed && (msg.status === 'new' || msg.status === 'read');
    if (filterType === 'waiting_user') return !msg.is_closed && msg.status === 'replied';
    if (filterType === 'resolved') return msg.is_closed || msg.status === 'closed';
    if (filterType === 'starred') return msg.is_starred;
    if (filterType === 'spam') return msg.status === 'spam';
    if (filterType === 'unassigned') return !msg.assigned_to;

    return true;
  }).sort((a, b) => {
    if (sortOrder === 'oldest_unreplied') {
      const aReplied = a.status === 'replied' || a.is_closed ? 1 : 0;
      const bReplied = b.status === 'replied' || b.is_closed ? 1 : 0;
      if (aReplied !== bReplied) return aReplied - bReplied;
      return new Date(a.created_at) - new Date(b.created_at);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl">
        
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Tất cả', count: messages.length },
            { id: 'waiting_me', label: 'Chờ tôi trả lời', count: messages.filter(m => !m.is_closed && (m.status === 'new' || m.status === 'read')).length },
            { id: 'waiting_user', label: 'Chờ User', count: messages.filter(m => !m.is_closed && m.status === 'replied').length },
            { id: 'resolved', label: 'Đã giải quyết', count: messages.filter(m => m.is_closed).length },
            { id: 'starred', label: 'Gắn sao', count: messages.filter(m => m.is_starred).length },
            { id: 'spam', label: 'Spam', count: messages.filter(m => m.status === 'spam').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filterType === tab.id ? 'bg-blue-700 text-white' : 'bg-zinc-700/50 text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none"
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest_unreplied">Cũ nhất chưa trả lời (SLA)</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (Hiển thị khi có chọn ít nhất 1 tin) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-2.5 px-4 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-200 animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span>Đã chọn <strong>{selectedIds.length}</strong> cuộc hội thoại</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('mark_read')}
              disabled={isBulkProcessing}
              className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition"
            >
              Đánh dấu đã đọc
            </button>
            <button
              onClick={() => handleBulkAction('resolve')}
              disabled={isBulkProcessing}
              className="px-3 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 font-medium transition"
            >
              Đã giải quyết (Đóng)
            </button>
            <button
              onClick={() => handleBulkAction('spam')}
              disabled={isBulkProcessing}
              className="px-3 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 font-medium transition"
            >
              Đánh dấu Spam
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={isBulkProcessing}
              className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 font-medium transition"
            >
              Xóa
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 hover:text-white transition"
              title="Bỏ chọn tất cả"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden min-h-[640px]">
        
        {/* Left Column: Conversation List (5 cols) */}
        <div className="lg:col-span-5 border-r border-zinc-800/80 flex flex-col">
          
          {/* Header of List */}
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/60">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 font-medium hover:text-zinc-200 transition"
            >
              {selectedIds.length === filteredMessages.length && filteredMessages.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-500" />
              ) : (
                <Square className="w-4 h-4 text-zinc-500" />
              )}
              <span>Chọn tất cả ({filteredMessages.length})</span>
            </button>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 max-h-[620px]">
            {filteredMessages.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
                <Inbox className="w-8 h-8 mx-auto text-zinc-600 stroke-1" />
                <p>Không có tin nhắn nào trong mục này</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isChecked = selectedIds.includes(msg.id);
                const slaBadge = getSlaBadge(msg);

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full text-left p-3.5 transition flex items-start gap-3 relative cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-950/30 border-l-4 border-l-blue-500'
                        : 'hover:bg-zinc-800/40 border-l-4 border-l-transparent'
                    } ${!msg.is_read ? 'bg-zinc-800/20' : ''}`}
                  >
                    {/* Checkbox */}
                    <div 
                      onClick={(e) => handleToggleSelectId(msg.id, e)}
                      className="pt-0.5 text-zinc-500 hover:text-zinc-300"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          {!msg.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                          <span className={`text-xs truncate ${!msg.is_read ? 'font-bold text-zinc-100' : 'font-medium text-zinc-300'}`}>
                            {msg.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(msg, e)}
                            className={`p-0.5 rounded transition ${
                              msg.is_starred ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${msg.is_starred ? 'fill-amber-400' : ''}`} />
                          </button>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {msg.created_at ? new Date(msg.created_at).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>
                      </div>

                      <h4 className={`text-xs line-clamp-1 ${!msg.is_read ? 'font-bold text-zinc-100' : 'text-zinc-300'}`}>
                        {msg.subject || 'Liên hệ không có tiêu đề'}
                      </h4>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {msg.message}
                      </p>

                      {/* Badges: SLA, Closed, Replied */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {slaBadge}
                        {msg.is_closed ? (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Đã đóng</span>
                          </span>
                        ) : msg.status === 'replied' ? (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400">
                            Đã trả lời
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-400">
                            Cần phản hồi
                          </span>
                        )}
                        {msg.category && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 font-mono">
                            #{msg.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detail, Chat History & Quick Reply (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-zinc-950/20">
          {selectedMessage ? (
            <>
              {/* Header: User metadata & actions */}
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-100 line-clamp-1">
                      {selectedMessage.subject || 'Trao đổi liên hệ'}
                    </h3>
                    {selectedMessage.is_closed ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-semibold shrink-0">
                        Đã đóng
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 font-semibold shrink-0">
                        Đang mở
                      </span>
                    )}
                  </div>

                  {/* Thông tin người dùng (Sidebar-like details) */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 text-zinc-200 font-medium">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      {selectedMessage.name} ({selectedMessage.email})
                    </span>
                    {selectedMessage.user_info && (
                      <span className="text-blue-400 font-medium">
                        • {selectedMessage.user_info.total_conversations} hội thoại trước
                      </span>
                    )}
                    {selectedMessage.ip_address && (
                      <span className="font-mono text-zinc-500">
                        • IP: {selectedMessage.ip_address}
                      </span>
                    )}
                    {selectedMessage.device_type && (
                      <span className="text-zinc-500">
                        • {selectedMessage.device_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Close/Reopen, Star, Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleClose(selectedMessage)}
                    className="p-1.5 text-xs font-semibold rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition flex items-center gap-1"
                    title={selectedMessage.is_closed ? 'Mở lại hội thoại' : 'Đóng hội thoại'}
                  >
                    {selectedMessage.is_closed ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-zinc-400" />}
                    <span className="hidden sm:inline">{selectedMessage.is_closed ? 'Mở lại' : 'Đóng'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleStar(selectedMessage)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 bg-zinc-800 hover:bg-zinc-700 transition"
                    title="Ghim tin nhắn"
                  >
                    <Star className={`w-4 h-4 ${selectedMessage.is_starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 bg-zinc-800 hover:bg-zinc-700 transition"
                    title="Xóa hội thoại"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Thread history */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[440px]">
                
                {/* 1. Tin nhắn gốc ban đầu */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {selectedMessage.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="max-w-[85%] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-200">
                        {selectedMessage.name} (Khách / Người gửi)
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl rounded-tl-sm bg-zinc-800/90 border border-zinc-700/80 text-xs text-zinc-200 leading-relaxed shadow-sm whitespace-pre-wrap">
                      {selectedMessage.message}
                    </div>
                  </div>
                </div>

                {/* 2. Các lượt trao đổi & Ghi chú nội bộ */}
                {selectedMessage.replies && selectedMessage.replies.map((reply) => {
                  const isUser = reply.sender_type === 'user';
                  const isInternal = reply.is_internal;

                  return (
                    <div
                      key={reply.id}
                      className={`flex items-start gap-3 ${isUser ? '' : 'flex-row-reverse'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                        isInternal 
                          ? 'bg-amber-600 text-white' 
                          : isUser 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-emerald-600 text-white'
                      }`}>
                        {isInternal ? <FileText className="w-4 h-4" /> : isUser ? 'U' : <ShieldCheck className="w-4 h-4" />}
                      </div>

                      <div className={`max-w-[85%] space-y-1 ${isUser ? '' : 'items-end flex flex-col'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                            {isInternal ? 'Ghi chú nội bộ (Chỉ Admin thấy)' : isUser ? 'Người dùng' : 'Admin'}
                            {isInternal && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">Internal</span>}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {reply.sent_at ? new Date(reply.sent_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                          isInternal
                            ? 'rounded-tr-sm bg-amber-950/40 border border-amber-800/60 text-amber-200 font-sans italic'
                            : isUser
                              ? 'rounded-tl-sm bg-zinc-800/90 border border-zinc-700/80 text-zinc-200'
                              : 'rounded-tr-sm bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 font-sans'
                        }`}>
                          {reply.reply_content}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Reply & Note Composer */}
              <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-900/60 space-y-2.5">
                
                {/* Tool bar: Canned replies, Internal Note toggle, Close checkbox */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    
                    {/* Mode Toggle: Trả lời công khai vs Ghi chú nội bộ */}
                    <div className="flex rounded-xl bg-zinc-800 p-0.5 border border-zinc-700 text-xs">
                      <button
                        type="button"
                        onClick={() => setIsInternalNote(false)}
                        className={`px-3 py-1 rounded-lg font-medium transition ${
                          !isInternalNote ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Trả lời User
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInternalNote(true)}
                        className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                          isInternalNote ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ghi chú nội bộ</span>
                      </button>
                    </div>

                    {/* Mẫu trả lời nhanh dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCannedDropdown(!showCannedDropdown)}
                        className="px-2.5 py-1 text-xs rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Mẫu trả lời nhanh</span>
                      </button>

                      {showCannedDropdown && (
                        <div className="absolute left-0 bottom-full mb-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-30 p-1.5 space-y-1">
                          <p className="text-[10px] text-zinc-400 px-2 py-1 font-semibold uppercase">Chọn câu trả lời có sẵn:</p>
                          {CANNED_REPLIES.map((canned, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setReplyText(canned.text);
                                setShowCannedDropdown(false);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-zinc-800 text-xs text-zinc-200 transition"
                            >
                              <p className="font-semibold text-blue-400">{canned.title}</p>
                              <p className="text-[10px] text-zinc-400 line-clamp-1">{canned.text}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tùy chọn đóng hội thoại sau khi trả lời */}
                  {!isInternalNote && (
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={closeAfterReply}
                        onChange={(e) => setCloseAfterReply(e.target.checked)}
                        className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0"
                      />
                      <span>Đóng hội thoại sau khi gửi</span>
                    </label>
                  )}
                </div>

                {/* Input Textarea & Send button */}
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isInternalNote 
                        ? 'Nhập ghi chú nội bộ (chỉ quản trị viên thấy, không gửi tới người dùng)...' 
                        : 'Nhập nội dung phản hồi gửi tới người dùng...'
                    }
                    className={`flex-1 p-2.5 text-xs rounded-xl border text-zinc-100 focus:outline-none transition resize-none ${
                      isInternalNote
                        ? 'bg-amber-950/20 border-amber-800/60 focus:border-amber-500'
                        : 'bg-zinc-800 border-zinc-700 focus:border-blue-500'
                    }`}
                    disabled={isSubmittingReply}
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReply || !replyText.trim()}
                    className={`px-5 rounded-xl font-semibold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition shrink-0 ${
                      isInternalNote
                        ? 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {isSubmittingReply ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{isInternalNote ? 'Lưu' : 'Gửi'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center space-y-2">
              <MessageSquare className="w-10 h-10 stroke-1 text-zinc-600" />
              <p className="text-xs">Chọn một cuộc hội thoại bên trái để xem nội dung và trả lời</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
