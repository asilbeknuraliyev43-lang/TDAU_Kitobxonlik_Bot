import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import {
  User as UserIcon,
  Sparkles,
  BookOpen,
  Clock,
  Flame,
  Award,
  Crown,
  Edit3,
  Phone,
  Gift,
  AlertTriangle,
  Users,
  CheckCircle2,
  Share2,
  Headphones,
  Settings,
  ChevronRight,
  KeyRound,
  GraduationCap,
} from 'lucide-react';
import { triggerHaptic, openTelegramChat } from '../../services/telegram.js';
import { SettingsModal } from './SettingsModal.js';
import { EditProfileModal } from './EditProfileModal.js';
import { ReferralModal } from '../../components/ReferralModal.js';
import confetti from 'canvas-confetti';

export const ProfilePage: React.FC = () => {
  const {
    user,
    stats,
    coinBalance,
    updateCoinBalance,
    showToast,
    refreshUserData,
    setActiveTab,
    isSettingsOpen,
    setIsSettingsOpen,
    isReferralModalOpen,
    setIsReferralModalOpen,
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);

  const fullName = user?.full_name || 'Kitobxon';
  const username = user?.username ? `@${user.username}` : `@id${user?.telegram_id || '185791049'}`;
  const isPremium = user?.is_premium === 1;

  const readBooksCount = stats?.booksCount || 0;
  const isUstoz = (user?.coin_balance || 0) >= 1000 || readBooksCount >= 3;
  const rankLabel = isUstoz ? 'Ustoz' : 'Talaba';
  const rankIcon = isUstoz ? '🧑‍🏫' : '🎓';

  const targetBooksForKeys = 10;
  const booksRemaining = Math.max(0, targetBooksForKeys - readBooksCount);
  const keysPercent = Math.min(100, Math.round((readBooksCount / targetBooksForKeys) * 100));

  const referralCount = stats?.referralCount || 0;
  const neededForContest = Math.max(0, 5 - referralCount);

  const handleClaimDailyBonus = async () => {
    try {
      setClaimingBonus(true);
      triggerHaptic('medium');
      const res = await api.claimDailyBonus();
      updateCoinBalance(res.newBalance);
      triggerHaptic('success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
      showToast(res.message, 'success');
      refreshUserData();
    } catch (err: any) {
      showToast(err.message || 'Bonusni olishda xatolik', 'warning');
    } finally {
      setClaimingBonus(false);
    }
  };

  return (
    <div className="pb-24 px-4 pt-3 space-y-4 animate-fade-in text-slate-100 bg-[#0B0E14] min-h-screen">
      {/* 1. User Header Card */}
      <div className="p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 p-0.5 shadow-lg relative shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={fullName}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              ) : (
                <div className="w-full h-full bg-[#182236] rounded-[14px] flex items-center justify-center text-amber-400 text-xl font-black">
                  {fullName[0]}
                </div>
              )}
              {isPremium && (
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-xs">
                  <Crown className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base text-white truncate">{fullName}</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[9px] font-black uppercase">
                  {rankLabel} {rankIcon}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">{username}</p>
              {user?.phone_number ? (
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-amber-500" />
                  <span>{user.phone_number}</span>
                </p>
              ) : (
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                  Telefon kiritilmagan
                </span>
              )}
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsEditModalOpen(true);
            }}
            className="p-2.5 rounded-2xl bg-[#1C2538] hover:bg-[#24314A] text-slate-300 hover:text-white transition-all active:scale-95 shrink-0 border border-[#2D3C59]"
            title="Tahrirlash"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Gamification: Rank & 10-Book Keys Progress */}
      <div className="p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪙</span>
            <div className="text-sm font-extrabold text-white">
              Balans: <span className="text-amber-400 font-black">{coinBalance.toLocaleString()} Coin</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs">
            <span>Maqom:</span>
            <span className="text-white font-black">{rankLabel} {rankIcon}</span>
          </div>
        </div>

        {/* 10-Book Keys Progress Box */}
        <div className="p-3.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Oltin Maxsus Keys ochilishi:</span>
            </span>
            <span className="font-mono text-amber-400 font-black">{readBooksCount} / 10 kitob</span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#182236] overflow-hidden">
            <div
              style={{ width: `${keysPercent}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
            />
          </div>

          {booksRemaining > 0 ? (
            <p className="text-[11px] text-slate-400 leading-tight">
              {readBooksCount >= 1 ? (
                <span>📝 1-kitob o‘qilgan, so‘rovnoma tayyor! Yana <b>{booksRemaining} ta kitob</b> o‘qilsa Oltin Keys ochiladi.</span>
              ) : (
                <span>1-kitobni o‘qigach bilim so‘rovnomasi ochiladi. 10 ta o‘qilgach esa <b>Oltin Maxsus Keys</b> ochiladi! 🎁</span>
              )}
            </p>
          ) : (
            <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Oltin Maxsus Keys muvaffaqiyatli ochildi! Siz Ustoz darajasidasiz!
            </p>
          )}
        </div>

        {/* Referrals & Contest Reminder */}
        <div className="pt-2 border-t border-[#1E293B] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-500" /> Taklif etilganlar:
            </span>
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsReferralModalOpen(true);
              }}
              className="text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-1 text-xs"
            >
              <span>{referralCount} ta (Do‘st taklif qilish)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {neededForContest > 0 ? (
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[11px] text-amber-300 font-bold leading-tight">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Tanlov uchun yana {neededForContest} ta do‘st kerak</span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsReferralModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-[10px]"
              >
                Taklif qilish
              </button>
            </div>
          ) : (
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-[11px] text-emerald-300 font-bold leading-tight">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Siz haftalik Kindle tanlovida qatnashmoqdasiz! 🎉</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. 4 Statistics Boxes */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] text-center space-y-1 shadow-xs">
          <BookOpen className="w-4 h-4 text-amber-500 mx-auto" />
          <div className="font-black text-sm text-white">{readBooksCount}</div>
          <div className="text-[9px] text-slate-400 font-bold">Kitoblar</div>
        </div>

        <div className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] text-center space-y-1 shadow-xs">
          <Clock className="w-4 h-4 text-orange-400 mx-auto" />
          <div className="font-black text-sm text-white">{stats?.readingHours || 0}s</div>
          <div className="text-[9px] text-slate-400 font-bold">O‘qish vaqti</div>
        </div>

        <div className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] text-center space-y-1 shadow-xs">
          <Flame className="w-4 h-4 text-amber-500 mx-auto" />
          <div className="font-black text-sm text-white">{stats?.streakDays || 1}</div>
          <div className="text-[9px] text-slate-400 font-bold">Kun seriyasi</div>
        </div>

        <div className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] text-center space-y-1 shadow-xs">
          <Award className="w-4 h-4 text-yellow-400 mx-auto" />
          <div className="font-black text-sm text-white">{isUstoz ? 'Ustoz' : 'Talaba'}</div>
          <div className="text-[9px] text-slate-400 font-bold">Maqom</div>
        </div>
      </div>

      {/* 4. Menu Items */}
      <div className="rounded-3xl bg-[#141B29] border border-[#232F47] overflow-hidden shadow-xs divide-y divide-[#1E293B]">
        <button
          onClick={() => {
            triggerHaptic('light');
            setIsReferralModalOpen(true);
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#1A2336] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <Share2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-white">🤝 Do‘st taklif qilish (+50 Coin)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('library');
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#1A2336] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1E293B] text-slate-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-white">📖 Kutubxona va PDF Kitoblar</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsSettingsOpen(true);
          }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#1A2336] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1E293B] text-slate-300">
              <Settings className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-white">⚙️ Sozlamalar</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Telegram Support @Tdau_admin */}
        <button
          onClick={() => openTelegramChat('https://t.me/Tdau_admin')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#1A2336] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-white block">🎧 Qo‘llab-quvvatlash va Savollar</span>
              <span className="text-[10px] text-amber-400 font-mono">@Tdau_admin</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Modals */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isEditModalOpen && <EditProfileModal onClose={() => setIsEditModalOpen(false)} />}
      {isReferralModalOpen && <ReferralModal onClose={() => setIsReferralModalOpen(false)} />}
    </div>
  );
};
