import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Inbox, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  User, 
  ShieldCheck, 
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Trash2,
  Download,
  Lock,
  PlusCircle,
  HelpCircle,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  ExternalLink,
  Filter
} from 'lucide-react';
import { contentService } from '../../services/contentService';
import { userService } from '../../services/userService';
import { useApp } from '../../contexts/AppContext';
import { getSocket } from '../../services/socketService';

export default function UserInbox() {
  const { user } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const msgIdParam = searchParams.get('msgId');

  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('all'); // 'all' | 'messages' | 'files' | 'people'
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'waiting_admin' | 'replied' | 'closed'
  
  // Trạng thái gửi phản hồi & tệp đính kèm
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [isUploadingReplyFile, setIsUploadingReplyFile] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState('');
  const [replyError, setReplyError] = useState('');

  // Modal gửi liên hệ mới
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('question');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newAttachments, setNewAttachments] = useState([]);
  const [isUploadingNewFile, setIsUploadingNewFile] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [userList, setUserList] = useState([]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const fileInputRef = useRef(null);
  const newFileInputRef = useRef(null);

  const chatBottomRef = useRef(null);

  const fetchMessages = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await contentService.getUserMessages();
      const list = res.data || [];
      setMessages(list);

      // Nếu có query param msgId hoặc đang chọn message cũ
      if (msgIdParam) {
        const found = list.find(m => String(m.id) === String(msgIdParam));
        if (found) setSelectedMessage(found);
        else if (list.length > 0 && !selectedMessage) setSelectedMessage(list[0]);
      } else if (list.length > 0 && !selectedMessage) {
        setSelectedMessage(list[0]);
      } else if (selectedMessage) {
        const updated = list.find(m => m.id === selectedMessage.id);
        if (updated) setSelectedMessage(updated);
      }
    } catch (err) {
      console.error('Lỗi tải tin nhắn người dùng:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [msgIdParam]);

  // Nếu người dùng hiện tại là Admin -> Lấy danh sách thành viên để phục vụ gửi tin nhắn trực tiếp
  useEffect(() => {
    if (user?.role === 'admin' && isNewContactOpen && userList.length === 0) {
      userService.getAdminUsers()
        .then(res => {
          const list = res.data || res || [];
          setUserList(list.filter(u => u.id !== user.id));
        })
        .catch(console.error);
    }
  }, [user, isNewContactOpen, userList.length]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessage?.replies]);

  // Lắng nghe sự kiện cập nhật thời gian thực (WebSocket) với Room bảo mật & Auto-refresh dự phòng
  useEffect(() => {
    const socket = getSocket();
    const token = localStorage.getItem('token');

    // Khi chọn hội thoại: Xin tham gia Room bảo mật conv:<id>
    if (selectedMessage?.id) {
      socket.emit('conversation:join', { id: selectedMessage.id, token });
    }

    const handleNewMessage = (payload) => {
      if (payload && payload.data) {
        const updatedMsg = payload.data;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        if (selectedMessage && selectedMessage.id === updatedMsg.id) {
          setSelectedMessage(updatedMsg);
        }
      }
    };

    const handleInboxChanged = (payload) => {
      fetchMessages(true);
    };

    // Khi tab quay lại foreground hoặc reconnect -> Tự động đồng bộ bù dữ liệu
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages(true);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('inbox:changed', handleInboxChanged);
    socket.on('connect', () => fetchMessages(true));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling dự phòng thưa (mỗi 10s) đảm bảo tin nhắn không bao giờ bị bỏ sót
    const fallbackInterval = setInterval(() => {
      fetchMessages(true);
    }, 10000);

    return () => {
      if (selectedMessage?.id) {
        socket.emit('conversation:leave', { id: selectedMessage.id });
      }
      socket.off('message:new', handleNewMessage);
      socket.off('inbox:changed', handleInboxChanged);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(fallbackInterval);
    };
  }, [selectedMessage?.id, user?.id]);

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    setSearchParams({ msgId: msg.id });
    setReplySuccess('');
    setReplyError('');
    setReplyText('');
    setReplyAttachments([]);
  };

  // Upload file trong composer reply
  const handleUploadReplyFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingReplyFile(true);
    setReplyError('');
    try {
      const res = await contentService.uploadChatAttachment(formData);
      const fileData = res.data || res;
      setReplyAttachments(prev => [...prev, fileData]);
    } catch (err) {
      setReplyError(err?.message || 'Không thể tải file lên.');
    } finally {
      setIsUploadingReplyFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload file trong modal tạo hội thoại mới
  const handleUploadNewFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingNewFile(true);
    try {
      const res = await contentService.uploadChatAttachment(formData);
      const fileData = res.data || res;
      setNewAttachments(prev => [...prev, fileData]);
    } catch (err) {
      alert(err?.message || 'Không thể tải file lên.');
    } finally {
      setIsUploadingNewFile(false);
      if (newFileInputRef.current) newFileInputRef.current.value = '';
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if ((!replyText.trim() && replyAttachments.length === 0) || !selectedMessage) return;

    setSubmittingReply(true);
    setReplyError('');
    setReplySuccess('');

    try {
      const res = await contentService.userReplyMessage(selectedMessage.id, {
        reply_content: replyText.trim() || '(Đã gửi tệp đính kèm)',
        attachments: replyAttachments
      });
      setReplyText('');
      setReplyAttachments([]);
      setReplySuccess('Đã gửi phản hồi thành công.');
      // Cập nhật lại thread hội thoại
      if (res.data) {
        setSelectedMessage(res.data);
        setMessages(prev => prev.map(m => m.id === res.data.id ? res.data : m));
      } else {
        await fetchMessages(true);
      }
      setTimeout(() => setReplySuccess(''), 4000);
    } catch (err) {
      setReplyError(err?.message || 'Có lỗi xảy ra khi gửi phản hồi.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Quyền riêng tư: Xóa hội thoại
  const handleDeleteConversation = async (msgId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cuộc trao đổi này khỏi hộp thư của bạn không?')) return;
    try {
      await contentService.userDeleteMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      if (selectedMessage?.id === msgId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      alert(err?.message || 'Không thể xóa hội thoại.');
    }
  };

  // Quyền riêng tư: Xuất hội thoại (Export JSON / Text)
  const handleExportConversation = (msg) => {
    const textContent = `HỘI THOẠI HỖ TRỢ - ALLINONEBLOG
Mã hội thoại: #${msg.id}
Tiêu đề: ${msg.subject}
Chuyên mục: ${msg.category}
Thời gian tạo: ${msg.created_at}
Trạng thái: ${msg.is_closed ? 'Đã đóng' : msg.status}

[TIN NHẮN BAN ĐẦU - ${msg.name}]
${msg.message}

--- CÁC LƯỢT PHẢN HỒI ---
${(msg.replies || []).map(r => `[${r.sender_name} - ${r.sent_at}]:\n${r.reply_content}\n`).join('\n')}
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoi-thoai-${msg.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Gửi liên hệ mới dạng popup modal
  const handleCreateNewConversation = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung tin nhắn.');
      return;
    }

    if (user?.role === 'admin' && !targetUserId) {
      alert('Vui lòng chọn thành viên mà bạn muốn gửi tin nhắn trao đổi.');
      return;
    }

    setIsSubmittingNew(true);
    try {
      await contentService.sendMessage({
        name: user?.display_name || user?.username || 'Admin',
        email: user?.email || '',
        subject: newSubject.trim(),
        category: newCategory,
        message: newMessage.trim(),
        attachments: newAttachments,
        target_user_id: user?.role === 'admin' ? targetUserId : undefined,
        fill_time_ms: 3000
      });
      setIsNewContactOpen(false);
      setNewSubject('');
      setNewMessage('');
      setNewAttachments([]);
      setTargetUserId('');
      await fetchMessages(true);
    } catch (err) {
      alert(err?.message || 'Lỗi khi gửi tin nhắn liên hệ.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    const q = searchTerm.toLowerCase().trim();

    // 1. Kiểm tra Lọc theo phạm vi (Search Scope: all | messages | files | people)
    let matchQuery = true;
    if (q) {
      if (searchScope === 'all') {
        // Tìm toàn diện: Tiêu đề, tin nhắn mở đầu, nội dung các câu trả lời (replies), tên tệp đính kèm, người gửi/người nhận
        const hasInSubject = m.subject && m.subject.toLowerCase().includes(q);
        const hasInMainMsg = m.message && m.message.toLowerCase().includes(q);
        const hasInCategory = m.category && m.category.toLowerCase().includes(q);
        const hasInReplies = m.replies && m.replies.some(r => r.reply_content && r.reply_content.toLowerCase().includes(q));
        const hasInPeople = 
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q)) ||
          (m.recipient_info?.username && m.recipient_info.username.toLowerCase().includes(q)) ||
          (m.recipient_info?.display_name && m.recipient_info.display_name.toLowerCase().includes(q)) ||
          (m.sender_info?.username && m.sender_info.username.toLowerCase().includes(q)) ||
          (m.sender_info?.display_name && m.sender_info.display_name.toLowerCase().includes(q));
        const hasInFiles = 
          (m.attachments && m.attachments.some(a => a.filename && a.filename.toLowerCase().includes(q))) ||
          (m.replies && m.replies.some(r => r.attachments && r.attachments.some(a => a.filename && a.filename.toLowerCase().includes(q))));

        matchQuery = hasInSubject || hasInMainMsg || hasInCategory || hasInReplies || hasInPeople || hasInFiles;
      } else if (searchScope === 'messages') {
        // Chỉ tìm trong nội dung tin nhắn (tin nhắn gốc + các tin nhắn phản hồi tiếp)
        const hasInSubject = m.subject && m.subject.toLowerCase().includes(q);
        const hasInMainMsg = m.message && m.message.toLowerCase().includes(q);
        const hasInReplies = m.replies && m.replies.some(r => r.reply_content && r.reply_content.toLowerCase().includes(q));
        matchQuery = hasInSubject || hasInMainMsg || hasInReplies;
      } else if (searchScope === 'files') {
        // Chỉ tìm các hội thoại có tệp hoặc ảnh đính kèm (hoặc tên tệp trùng khớp từ khóa)
        const allAtts = [
          ...(m.attachments || []),
          ...(m.replies ? m.replies.flatMap(r => r.attachments || []) : [])
        ];
        if (allAtts.length === 0) return false;
        matchQuery = allAtts.some(a => (a.filename && a.filename.toLowerCase().includes(q)) || (a.file_type && a.file_type.toLowerCase().includes(q)));
      } else if (searchScope === 'people') {
        // Chỉ tìm theo người gửi / người nhận tham gia
        matchQuery = 
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q)) ||
          (m.recipient_info?.username && m.recipient_info.username.toLowerCase().includes(q)) ||
          (m.recipient_info?.display_name && m.recipient_info.display_name.toLowerCase().includes(q)) ||
          (m.sender_info?.username && m.sender_info.username.toLowerCase().includes(q)) ||
          (m.sender_info?.display_name && m.sender_info.display_name.toLowerCase().includes(q));
      }
    } else {
      // Khi không gõ từ khóa nhưng chọn tab 'files' -> Lọc các hội thoại có đính kèm file
      if (searchScope === 'files') {
        const hasAnyFile = (m.attachments && m.attachments.length > 0) || 
                           (m.replies && m.replies.some(r => r.attachments && r.attachments.length > 0));
        if (!hasAnyFile) return false;
      }
    }

    if (!matchQuery) return false;

    // 2. Lọc theo trạng thái Tab
    if (statusTab === 'waiting_admin') return !m.is_closed && (m.status === 'new' || (m.replies?.length === 0));
    if (statusTab === 'replied') return !m.is_closed && (m.status === 'replied' || (m.replies?.length > 0));
    if (statusTab === 'closed') return m.is_closed || m.status === 'closed';

    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <Link to="/" className="hover:text-blue-600 transition">Trang chủ</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">Hộp thư & Phản hồi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-3">
              <Inbox className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <span>Hộp thư liên hệ</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-medium">
                {messages.length} hội thoại
              </span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Theo dõi tình trạng câu hỏi, ý kiến đóng góp và trao đổi trực tiếp 2 chiều với Quản trị viên blog.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMessages(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-sm"
              title="Làm mới hộp thư"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              onClick={() => setIsNewContactOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Bắt đầu hội thoại mới</span>
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-sm">Đang tải danh sách tin nhắn...</p>
          </div>
        ) : messages.length === 0 ? (
          /* Empty state */
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Bạn chưa có hội thoại nào</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Bạn có thể bắt đầu bằng việc gửi câu hỏi kỹ thuật, yêu cầu hợp tác hoặc đóng góp ý kiến. Quản trị viên sẽ phản hồi trực tiếp vào hộp thư này.
            </p>
            <button
              onClick={() => setIsNewContactOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Bắt đầu hội thoại mới</span>
            </button>
          </div>
        ) : (
          /* 2-Column Chat / Inbox Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden min-h-[620px]">
            
            {/* Left Column: Thread List (5 cols) */}
            <div className={`lg:col-span-5 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col ${selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
              
              {/* Search & MS Teams Style Scope Filter */}
              <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800 space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm người, tin nhắn, tệp đính kèm..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* MS Teams Style Search Scope Pills */}
                <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'messages', label: 'Tin nhắn' },
                    { id: 'files', label: 'Tệp & Ảnh' },
                    { id: 'people', label: 'Thành viên' },
                  ].map(pill => (
                    <button
                      key={pill.id}
                      onClick={() => setSearchScope(pill.id)}
                      className={`px-2.5 py-0.5 rounded-full font-medium text-[10px] whitespace-nowrap transition border ${
                        searchScope === pill.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5 pt-0.5 border-t border-zinc-100 dark:border-zinc-800/60">
                  {[
                    { id: 'all', label: 'Tất cả trạng thái' },
                    { id: 'waiting_admin', label: 'Chờ Admin' },
                    { id: 'replied', label: 'Đã trả lời' },
                    { id: 'closed', label: 'Đã đóng' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusTab(tab.id)}
                      className={`px-2 py-0.5 rounded-lg font-medium text-[10px] whitespace-nowrap transition ${
                        statusTab === tab.id
                          ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50 max-h-[600px]">
                {filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    Không tìm thấy hội thoại phù hợp
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isSelected = selectedMessage?.id === msg.id;
                    const repliesCount = msg.replies?.length || 0;
                    const hasAdminReply = msg.status === 'replied' || repliesCount > 0;

                    return (
                      <button
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg)}
                        className={`w-full text-left p-4 transition flex flex-col gap-1.5 relative group ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-l-blue-600'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            msg.is_closed
                              ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              : hasAdminReply
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}>
                            {msg.is_closed ? 'Đã đóng' : hasAdminReply ? 'Admin đã trả lời' : 'Chờ phản hồi'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {msg.created_at ? new Date(msg.created_at).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>

                        <h4 className={`text-xs font-bold line-clamp-1 ${
                          isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'
                        }`}>
                          {msg.subject || 'Liên hệ không có tiêu đề'}
                        </h4>

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {msg.message}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                          <span className="capitalize">#{msg.category || 'chung'}</span>
                          {repliesCount > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {repliesCount} lượt trả lời
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Chat/Thread Content (7 cols) */}
            <div className={`lg:col-span-7 flex flex-col ${selectedMessage ? 'flex' : 'hidden lg:flex'}`}>
              {selectedMessage ? (
                <>
                  {/* Thread Top Header */}
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {selectedMessage.subject || 'Trao đổi liên hệ'}
                        </h2>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {(() => {
                            // Xác định đối phương trao đổi (Counterpart)
                            let partnerName = 'Quản trị viên (Admin)';
                            if (user?.role === 'admin') {
                              partnerName = selectedMessage.recipient_info?.display_name || selectedMessage.recipient_info?.username || selectedMessage.name;
                            } else {
                              if (selectedMessage.sender_id && selectedMessage.sender_id !== user?.id) {
                                partnerName = selectedMessage.sender_info?.display_name || selectedMessage.sender_info?.username || 'Quản trị viên (Admin)';
                              }
                            }
                            return (
                              <span>Người trao đổi: <strong className="text-blue-600 dark:text-blue-400">{partnerName}</strong></span>
                            );
                          })()}
                          <span>•</span>
                          <span>Chuyên mục: <strong className="text-zinc-700 dark:text-zinc-300 capitalize">{selectedMessage.category || 'Chung'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions for user: Export, Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {user?.role === 'admin' && (
                        <Link
                          to={`/admin?tab=messages&msgId=${selectedMessage.id}`}
                          className="p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-1 transition font-medium"
                          title="Mở trong bảng điều khiển Quản trị viên"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Xem ở Admin</span>
                        </Link>
                      )}

                      <button
                        onClick={() => handleExportConversation(selectedMessage)}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-1 transition"
                        title="Xuất nội dung cuộc hội thoại"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Xuất file</span>
                      </button>

                      <button
                        onClick={() => handleDeleteConversation(selectedMessage.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Xóa hội thoại khỏi hộp thư"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Thread Body: Chronological Messages */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-5 max-h-[460px]">
                    
                    {/* 1. Tin nhắn ban đầu */}
                    {(() => {
                      const isInitialFromMe = selectedMessage.sender_id 
                        ? selectedMessage.sender_id === user?.id 
                        : (selectedMessage.user_id === user?.id || selectedMessage.email === user?.email);
                      const isInitialAdmin = !selectedMessage.recipient_id ? false : (selectedMessage.sender_id !== selectedMessage.recipient_id);

                      return (
                        <div className={`flex items-start gap-3 ${isInitialFromMe ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                            isInitialFromMe 
                              ? 'bg-blue-600 text-white' 
                              : isInitialAdmin 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-blue-600 text-white'
                          }`}>
                            {isInitialFromMe 
                              ? (user?.username?.charAt(0)?.toUpperCase() || 'U')
                              : (selectedMessage.name?.charAt(0)?.toUpperCase() || 'A')}
                          </div>
                          <div className={`max-w-[85%] space-y-1 ${isInitialFromMe ? 'items-end flex flex-col' : ''}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">
                                {isInitialFromMe ? 'Bạn' : selectedMessage.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                              isInitialFromMe 
                                ? 'rounded-tr-sm bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-zinc-800 dark:text-zinc-200' 
                                : 'rounded-tl-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                            }`}>
                              {selectedMessage.message}

                              {/* Hiển thị Tệp & Ảnh đính kèm của tin nhắn ban đầu */}
                              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                                    Tệp đính kèm ({selectedMessage.attachments.length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedMessage.attachments.map((att, idx) => {
                                      const isImg = att.file_type === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.filename || '');
                                      if (isImg) {
                                        return (
                                          <a
                                            key={idx}
                                            href={att.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group block relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 max-w-[200px] shadow-sm hover:opacity-95 transition"
                                          >
                                            <img
                                              src={att.url}
                                              alt={att.filename}
                                              className="max-h-40 w-auto object-cover rounded-lg group-hover:scale-105 transition duration-200"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-medium gap-1">
                                              <ExternalLink className="w-3.5 h-3.5" />
                                              <span>Xem ảnh</span>
                                            </div>
                                          </a>
                                        );
                                      }
                                      return (
                                        <a
                                          key={idx}
                                          href={att.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          download={att.filename}
                                          className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-blue-500 dark:hover:border-blue-500 transition shadow-xs max-w-xs"
                                        >
                                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                                            <FileText className="w-4 h-4" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold truncate">{att.filename}</p>
                                            <p className="text-[10px] text-zinc-400 font-mono">
                                              {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : 'Tệp tin'}
                                            </p>
                                          </div>
                                          <Download className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 shrink-0" />
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Danh sách các lượt trao đổi (MessageReplies) */}
                    {selectedMessage.replies && selectedMessage.replies.map((reply) => {
                      const isFromMe = (reply.user_id && reply.user_id === user?.id) || 
                                       (reply.sender_type === 'admin' && user?.role === 'admin' && reply.admin_id === user?.id) ||
                                       (reply.sender_type === 'user' && !reply.admin_id && user?.role !== 'admin');
                      const isAdmin = reply.sender_type === 'admin' || (!reply.user_id && reply.sender_type !== 'user');
                      const senderDisplayName = reply.sender_name || (isAdmin ? 'Quản trị viên (Admin)' : (selectedMessage.recipient_info?.display_name || selectedMessage.name || 'Thành viên'));

                      return (
                        <div
                          key={reply.id}
                          className={`flex items-start gap-3 ${isFromMe ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                            isFromMe
                              ? 'bg-blue-600 text-white'
                              : isAdmin
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-zinc-600 text-white'
                          }`}>
                            {isFromMe ? (user?.username?.charAt(0)?.toUpperCase() || 'U') : (isAdmin ? <ShieldCheck className="w-4 h-4" /> : (senderDisplayName.charAt(0)?.toUpperCase() || 'U'))}
                          </div>

                          <div className={`max-w-[85%] space-y-1 ${isFromMe ? 'items-end flex flex-col' : ''}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-1">
                                {isFromMe ? 'Bạn' : senderDisplayName}
                                {isAdmin && !isFromMe && <Sparkles className="w-3 h-3 text-amber-500 inline" />}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {reply.sent_at ? new Date(reply.sent_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>

                            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                              isFromMe
                                ? 'rounded-tr-sm bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-zinc-800 dark:text-zinc-200'
                                : isAdmin
                                  ? 'rounded-tl-sm bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-100 font-medium'
                                  : 'rounded-tl-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                            }`}>
                              {reply.reply_content}

                              {/* Hiển thị Tệp & Ảnh đính kèm của lượt phản hồi này */}
                              {reply.attachments && reply.attachments.length > 0 && (
                                <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                                    Tệp đính kèm ({reply.attachments.length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {reply.attachments.map((att, idx) => {
                                      const isImg = att.file_type === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.filename || '');
                                      if (isImg) {
                                        return (
                                          <a
                                            key={idx}
                                            href={att.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group block relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 max-w-[200px] shadow-sm hover:opacity-95 transition"
                                          >
                                            <img
                                              src={att.url}
                                              alt={att.filename}
                                              className="max-h-40 w-auto object-cover rounded-lg group-hover:scale-105 transition duration-200"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-medium gap-1">
                                              <ExternalLink className="w-3.5 h-3.5" />
                                              <span>Xem ảnh</span>
                                            </div>
                                          </a>
                                        );
                                      }
                                      return (
                                        <a
                                          key={idx}
                                          href={att.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          download={att.filename}
                                          className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-blue-500 dark:hover:border-blue-500 transition shadow-xs max-w-xs"
                                        >
                                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                                            <FileText className="w-4 h-4" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold truncate">{att.filename}</p>
                                            <p className="text-[10px] text-zinc-400 font-mono">
                                              {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : 'Tệp tin'}
                                            </p>
                                          </div>
                                          <Download className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 shrink-0" />
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={chatBottomRef} />
                  </div>

                  {/* Reply Composer Input hoặc Thông báo Đã đóng */}
                  <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 space-y-2">
                    {selectedMessage.is_closed && !selectedMessage.user_can_reopen ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs">
                        <Lock className="w-4 h-4 shrink-0 text-zinc-500" />
                        <span>Hội thoại này đã được quản trị viên giải quyết và đóng lại.</span>
                      </div>
                    ) : (
                      <>
                        {replySuccess && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{replySuccess}</span>
                          </div>
                        )}
                        {replyError && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{replyError}</span>
                          </div>
                        )}

                        {/* Preview các tệp đính kèm chuẩn bị gửi trong reply */}
                        {replyAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1 pb-1">
                            {replyAttachments.map((att, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs shadow-xs"
                              >
                                {att.file_type === 'image' ? (
                                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                )}
                                <span className="max-w-[140px] truncate font-medium text-zinc-800 dark:text-zinc-200">
                                  {att.filename}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  ({(att.file_size / 1024).toFixed(0)} KB)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReplyAttachments(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-0.5 text-zinc-400 hover:text-rose-500 transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <form onSubmit={handleSendReply} className="flex items-end gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUploadReplyFile}
                            className="hidden"
                          />

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingReplyFile || submittingReply}
                              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50 transition shadow-xs flex items-center justify-center shrink-0"
                              title="Đính kèm ảnh hoặc tài liệu (tối đa 15MB)"
                            >
                              {isUploadingReplyFile ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                              ) : (
                                <Paperclip className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <textarea
                            rows={2}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Nhập nội dung phản hồi tiếp cho Admin (hoặc đính kèm file/ảnh)..."
                            className="flex-1 p-3 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                            disabled={submittingReply}
                          />
                          <button
                            type="submit"
                            disabled={submittingReply || (!replyText.trim() && replyAttachments.length === 0)}
                            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition shrink-0"
                          >
                            {submittingReply ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Gửi</span>
                              </>
                            )}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-2">
                  <Inbox className="w-10 h-10 stroke-1" />
                  <p className="text-xs">Chọn một tin nhắn từ danh sách bên trái để xem trao đổi chi tiết</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Modal Bắt đầu hội thoại mới */}
      {isNewContactOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
            
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>Bắt đầu cuộc trao đổi mới</span>
              </h3>
              <button
                onClick={() => setIsNewContactOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewConversation} className="p-5 space-y-4">
              {/* Người nhận (Recipient) */}
              {user?.role === 'admin' ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Người nhận (Thành viên hệ thống) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  >
                    <option value="">-- Chọn thành viên nhận tin nhắn --</option>
                    {userList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.display_name || u.username} ({u.email}) - #{u.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-zinc-700 dark:text-zinc-300">
                      Gửi tới: <strong className="text-blue-600 dark:text-blue-400">Quản trị viên (Admin) Blog</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">Bảo mật 1-1</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Chuyên mục <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="project">Hợp tác dự án</option>
                  <option value="question">Hỏi đáp kỹ thuật</option>
                  <option value="feedback">Góp ý về blog</option>
                  <option value="bug">Báo lỗi hệ thống</option>
                  <option value="general">Chủ đề khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tiêu đề cuộc trao đổi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="VD: Cần tư vấn giải pháp triển khai Kubernetes..."
                  className="w-full p-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mô tả cụ thể nội dung bạn muốn trao đổi..."
                  className="w-full p-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Tệp & Hình ảnh đính kèm */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={newFileInputRef}
                  onChange={handleUploadNewFile}
                  className="hidden"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Tệp / Hình ảnh đính kèm
                  </span>
                  <button
                    type="button"
                    onClick={() => newFileInputRef.current?.click()}
                    disabled={isUploadingNewFile}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition"
                  >
                    {isUploadingNewFile ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                    )}
                    <span>{isUploadingNewFile ? 'Đang tải lên...' : 'Thêm tệp/ảnh'}</span>
                  </button>
                </div>

                {newAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {newAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs"
                      >
                        {att.file_type === 'image' ? (
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span className="max-w-[140px] truncate font-medium text-zinc-800 dark:text-zinc-200">
                          {att.filename}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          ({(att.file_size / 1024).toFixed(0)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="p-0.5 text-zinc-400 hover:text-rose-500 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewContactOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1.5"
                >
                  {isSubmittingNew ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Gửi tin nhắn</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
