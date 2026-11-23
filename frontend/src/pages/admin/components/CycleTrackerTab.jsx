import React, { useState, useEffect } from 'react';
import { 
  Heart, Lock, Unlock, KeyRound, Calendar, Sparkles, 
  Settings, Clock, AlertCircle, CheckCircle2, ChevronRight,
  Shield, Moon, Sun, Info, RefreshCw
} from 'lucide-react';
import userService from '../../../services/userService';
import { useApp } from '../../../contexts/AppContext';

export default function CycleTrackerTab() {
  const { lang, showToast } = useApp();
  
  // Trạng thái mở khóa bằng mã PIN
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Dữ liệu chu kỳ
  const [cycleData, setCycleData] = useState({
    partner_name: 'Em Bé',
    cycle_length: 28,
    period_length: 5,
    last_period_date: '',
    notes: ''
  });

  // Modal chỉnh sửa cấu hình
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...cycleData, new_pin: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Tải dữ liệu khi mở khóa thành công
  const loadCycleData = async () => {
    try {
      const res = await userService.getCycleData();
      const data = res?.data || res;
      if (data) {
        setCycleData(data);
        setEditForm({ ...data, new_pin: '' });
      }
    } catch (err) {
      console.error('Error fetching cycle data:', err);
    }
  };

  // Xác thực mã PIN
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setPinError('');
    setIsVerifying(true);
    try {
      const res = await userService.verifyCyclePin({ pin: pinInput });
      const data = res?.data || res;
      if (data) {
        setCycleData(data);
        setEditForm({ ...data, new_pin: '' });
        setIsUnlocked(true);
        setPinInput('');
      }
    } catch (err) {
      setPinError(err.response?.data?.message || err.message || 'Mã PIN không đúng.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Lưu cấu hình chu kỳ
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        partner_name: editForm.partner_name,
        cycle_length: Number(editForm.cycle_length),
        period_length: Number(editForm.period_length),
        last_period_date: editForm.last_period_date,
        notes: editForm.notes
      };
      if (editForm.new_pin && editForm.new_pin.trim().length >= 4) {
        payload.new_pin = editForm.new_pin.trim();
      }

      const res = await userService.updateCycleData(payload);
      const data = res?.data || res;
      if (data) {
        setCycleData(data);
      }
      setIsEditModalOpen(false);
      showToast('Đã cập nhật thông tin chu kỳ thành công!');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi lưu thông tin');
    } finally {
      setIsSaving(false);
    }
  };

  // Tính toán chu kỳ & giai đoạn
  const calculateCycle = () => {
    const cycleLen = cycleData.cycle_length || 28;
    const periodLen = cycleData.period_length || 5;

    if (!cycleData.last_period_date) {
      return {
        currentDay: 1,
        percent: 0,
        phase: 'Chưa thiết lập ngày bắt đầu',
        phaseEn: 'Not configured',
        phaseColor: 'text-zinc-400',
        phaseBg: 'bg-zinc-800',
        daysUntilNext: cycleLen,
        isPeriod: false,
        isOvulation: false,
        advice: 'Hãy bấm "Cài đặt chu kỳ" để nhập ngày bắt đầu kỳ kinh gần nhất.'
      };
    }

    const lastDate = new Date(cycleData.last_period_date);
    const today = new Date();
    // Bỏ qua giờ
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Ngày trong chu kỳ (1 -> cycleLen)
    const currentDay = ((diffDays % cycleLen) + cycleLen) % cycleLen + 1;
    const percent = Math.round((currentDay / cycleLen) * 100);
    const daysUntilNext = cycleLen - currentDay + 1;

    let phase = '';
    let phaseEn = '';
    let phaseColor = 'text-rose-500';
    let phaseBg = 'bg-rose-500/10 border-rose-500/30';
    let isPeriod = false;
    let isOvulation = false;
    let advice = '';

    if (currentDay <= periodLen) {
      // 1. Giai đoạn Hành kinh (Menstrual Phase)
      phase = 'Giai đoạn Hành kinh (Kỳ dâu)';
      phaseEn = 'Menstrual Phase';
      phaseColor = 'text-rose-500';
      phaseBg = 'bg-rose-500/10 border-rose-500/30';
      isPeriod = true;
      advice = '💖 Nàng có thể bị đau bụng, mỏi lưng và mệt mỏi. Hãy pha trà gừng ấm, chườm túi ấm, chiều chuộng và tránh để nàng làm việc nặng nhé!';
    } else if (currentDay < 12) {
      // 2. Giai đoạn Nang trứng (Follicular Phase)
      phase = 'Giai đoạn Nang trứng (Năng lượng cao)';
      phaseEn = 'Follicular Phase';
      phaseColor = 'text-amber-500';
      phaseBg = 'bg-amber-500/10 border-amber-500/30';
      advice = '✨ Tâm trạng nàng đang rất vui vẻ, năng động và tràn đầy năng lượng! Thời điểm tuyệt vời để đi chơi, hẹn hò hoặc cùng nàng khám phá điều mới.';
    } else if (currentDay >= 12 && currentDay <= 16) {
      // 3. Giai đoạn Rụng trứng (Ovulation Phase)
      phase = 'Giai đoạn Rụng trứng (Thời điểm vàng)';
      phaseEn = 'Ovulation Phase';
      phaseColor = 'text-emerald-500';
      phaseBg = 'bg-emerald-500/10 border-emerald-500/30';
      isOvulation = true;
      advice = '🌿 Nàng rạng rỡ và quyến rũ nhất trong chu kỳ. Khả năng thụ thai ở mức cao nhất. Hãy dành cho nàng những lời khen chân thành!';
    } else {
      // 4. Giai đoạn Hoàng thể / Tiền kinh nguyệt (Luteal / PMS Phase)
      phase = 'Giai đoạn Tiền kinh nguyệt (PMS)';
      phaseEn = 'Luteal / PMS Phase';
      phaseColor = 'text-purple-500';
      phaseBg = 'bg-purple-500/10 border-purple-500/30';
      advice = '🌙 Nàng dễ xúc động, nhạy cảm hoặc cáu gắt do hormone giảm. Hãy lắng nghe, kiên nhẫn, chuẩn bị đồ ăn vặt nàng thích và đừng tranh cãi nha!';
    }

    return {
      currentDay,
      percent,
      phase,
      phaseEn,
      phaseColor,
      phaseBg,
      daysUntilNext,
      isPeriod,
      isOvulation,
      advice
    };
  };

  const cycleInfo = calculateCycle();

  // Khóa màn hình nếu chưa nhập PIN
  if (!isUnlocked) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-xl animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Khu Vực Riêng Tư</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Nhập mã PIN bảo mật để truy cập bảng theo dõi chu kỳ
            </p>
          </div>

          {pinError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Nhập mã PIN (Mặc định: 123456)..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-center text-sm font-mono tracking-widest bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || !pinInput}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Mở khóa</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[10px] text-zinc-400">
            Gợi ý: Mã PIN mặc định là <strong>123456</strong> (có thể đổi sau khi vào)
          </p>
        </div>
      </div>
    );
  }

  // Bán kính vòng tròn đồng hồ chu kỳ
  const radius = 100;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (cycleInfo.percent / 100) * circumference;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
            <Heart className="w-6 h-6 fill-rose-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Nhịp Sinh Học & Chu Kỳ:</span>
              <span className="text-rose-500">{cycleData.partner_name || 'Em Bé'}</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Theo dõi chu kỳ 28 ngày & gợi ý chăm sóc tâm lý
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Cài đặt chu kỳ & PIN</span>
          </button>
          <button
            onClick={() => setIsUnlocked(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition"
            title="Khóa lại"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Circular Clock + Stages Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left: Vòng tròn đồng hồ chu kỳ 28 ngày (5 cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-8 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="relative flex items-center justify-center">
            {/* SVG Circle Progress */}
            <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
              {/* Vòng nền */}
              <circle
                stroke="currentColor"
                className="text-zinc-100 dark:text-zinc-800"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              {/* Vòng tiến trình */}
              <circle
                stroke="currentColor"
                className="text-rose-500 transition-all duration-1000 ease-out"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>

            {/* Nội dung ở giữa tâm vòng tròn */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                NGÀY THỨ
              </span>
              <span className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight my-0.5">
                {cycleInfo.currentDay}
              </span>
              <span className="text-xs font-semibold text-rose-500">
                / {cycleData.cycle_length || 28} ngày
              </span>
            </div>
          </div>

          <div className="mt-4 text-center space-y-1">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${cycleInfo.phaseBg} ${cycleInfo.phaseColor}`}>
              {cycleInfo.phase}
            </span>
            <p className="text-[11px] text-zinc-400">
              Kỳ tiếp theo dự kiến sau <strong>{cycleInfo.daysUntilNext} ngày</strong>
            </p>
          </div>
        </div>

        {/* Right: Trực quan 4 giai đoạn sinh học (7 cols) */}
        <div className="md:col-span-7 space-y-3">
          {[
            {
              id: 'menstrual',
              title: '1. Kỳ Hành Kinh (Menstrual)',
              days: `Ngày 1 - ${cycleData.period_length || 5}`,
              color: 'border-rose-500/40 bg-rose-500/5 text-rose-600 dark:text-rose-400',
              activeColor: 'ring-2 ring-rose-500',
              icon: Heart,
              desc: 'Niêm mạc bong tróc, cơ thể cần nghỉ ngơi và giữ ấm tuyệt đối.'
            },
            {
              id: 'follicular',
              title: '2. Nang Trứng (Follicular)',
              days: `Ngày ${(cycleData.period_length || 5) + 1} - 11`,
              color: 'border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400',
              activeColor: 'ring-2 ring-amber-500',
              icon: Sun,
              desc: 'Estrogen tăng cao, tâm trạng phấn khởi, rạng rỡ và nhiều năng lượng.'
            },
            {
              id: 'ovulation',
              title: '3. Rụng Trứng (Ovulation Window)',
              days: 'Ngày 12 - 16',
              color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
              activeColor: 'ring-2 ring-emerald-500',
              icon: Sparkles,
              desc: 'Trứng rụng, sức hút cao nhất, khả năng thụ thai ở đỉnh điểm.'
            },
            {
              id: 'luteal',
              title: '4. Hoàng Thể / PMS (Luteal Phase)',
              days: `Ngày 17 - ${cycleData.cycle_length || 28}`,
              color: 'border-purple-500/40 bg-purple-500/5 text-purple-600 dark:text-purple-400',
              activeColor: 'ring-2 ring-purple-500',
              icon: Moon,
              desc: 'Hormone sụt giảm, dễ nhạy cảm, cáu gắt và thèm đồ ngọt.'
            }
          ].map((stg) => {
            const Icon = stg.icon;
            const isCurrentStage = 
              (stg.id === 'menstrual' && cycleInfo.isPeriod) ||
              (stg.id === 'follicular' && cycleInfo.currentDay > (cycleData.period_length || 5) && cycleInfo.currentDay < 12) ||
              (stg.id === 'ovulation' && cycleInfo.isOvulation) ||
              (stg.id === 'luteal' && cycleInfo.currentDay > 16);

            return (
              <div 
                key={stg.id}
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3.5 bg-white dark:bg-zinc-900/60 ${stg.color} ${isCurrentStage ? 'ring-2 ring-offset-2 ring-rose-500 shadow-sm' : 'opacity-80'}`}
              >
                <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-xs shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{stg.title}</span>
                      {isCurrentStage && (
                        <span className="text-[9px] px-2 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                          HIỆN TẠI
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-500">{stg.days}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {stg.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lover Care Advice Box (Hộp gợi ý tâm lý cho người yêu) */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-purple-500/10 border border-rose-500/20 space-y-2">
        <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Gợi Ý Chăm Sóc Người Yêu Hôm Nay</span>
        </div>
        <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
          {cycleInfo.advice}
        </p>
        {cycleData.notes && (
          <div className="pt-2 border-t border-rose-500/20 text-[11px] text-zinc-500 dark:text-zinc-400 italic">
            <strong>Ghi chú riêng:</strong> {cycleData.notes}
          </div>
        )}
      </div>

      {/* Modal Cài đặt Chu kỳ & Đổi PIN */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-rose-500" />
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Cài Đặt Chu Kỳ & Bảo Mật
                </h4>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Biệt danh người yêu
                </label>
                <input
                  type="text"
                  value={editForm.partner_name}
                  onChange={(e) => setEditForm(p => ({ ...p, partner_name: e.target.value }))}
                  placeholder="e.g. Bé Yêu, Vợ..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ngày bắt đầu kỳ kinh gần nhất
                </label>
                <input
                  type="date"
                  required
                  value={editForm.last_period_date || ''}
                  onChange={(e) => setEditForm(p => ({ ...p, last_period_date: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Độ dài chu kỳ (ngày)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={45}
                    value={editForm.cycle_length}
                    onChange={(e) => setEditForm(p => ({ ...p, cycle_length: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Số ngày hành kinh (ngày)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={editForm.period_length}
                    onChange={(e) => setEditForm(p => ({ ...p, period_length: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Đổi mã PIN mới (Để trống nếu không đổi)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={editForm.new_pin}
                  onChange={(e) => setEditForm(p => ({ ...p, new_pin: e.target.value }))}
                  placeholder="Nhập 4-8 ký tự PIN mới..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ghi chú cá nhân
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Nàng thích uống trà gừng đường nâu..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
