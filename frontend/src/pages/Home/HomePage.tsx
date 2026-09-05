import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Banner, Book } from '../../types/index.js';
import {
  Sparkles,
  ChevronRight,
  Flame,
  Gift,
  Trophy,
  BookOpen,
  Star,
  Clock,
  Lock,
  ArrowRight,
  Users,
  Share2,
  KeyRound,
  GraduationCap,
} from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import { ReferralModal } from '../../components/ReferralModal.js';
import confetti from 'canvas-confetti';

export const HomePage: React.FC = () => {
  const {
    user,
    stats,
    setActiveTab,
    openReader,
    isReferralModalOpen,
    setIsReferralModalOpen,
    updateCoinBalance,
    showToast,
    refreshUserData,
  } = useApp();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [claimingBonus, setClaimingBonus] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const [bannersRes, booksRes] = await Promise.all([
        api.getBanners(),
        api.getBooks('Barchasi'),
      ]);
      setBanners(bannersRes.banners);
      setPopularBooks(booksRes.books);
    } catch (err) {
      console.error(err);
    }
  };

  const readingMins = stats?.readingMinutes || 15;
  const targetMins = 20;
  const goalPercent = Math.min(100, Math.round((readingMins / targetMins) * 100));

  const booksReadCount = stats?.booksCount || 0;
  const targetBooksForKeys = 10;
  const booksRemaining = Math.max(0, targetBooksForKeys - booksReadCount);
  const keysPercent = Math.min(100, Math.round((booksReadCount / targetBooksForKeys) * 100));

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
        origin: { y: 0.6 },
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
      {/* 1. Daily Reading Goal Ring Card */}
      <div className="p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Clock className="w-4 h-4" />
              <span>Kunlik Mutolaa Maqsadi</span>
            </div>
            <h3 className="font-extrabold text-base text-white">
              {readingMins} / {targetMins} daqiqa
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Maqsadga erishgach: <b className="text-amber-400">+50 Coin</b> bonus! 🌟
            </p>
          </div>

          {/* Radial Progress Circle */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#1E293B]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${goalPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-white">{goalPercent}%</span>
          </div>
        </div>
      </div>

      {/* 2. 10-Book Master Keys Progress Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#182236] to-[#141B29] border border-[#2D3C59] shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-white">Oltin Maxsus Keys</h4>
              <p className="text-[10px] text-slate-400">10 ta kitob o‘qiganda ochiladi</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black font-mono">
            {booksReadCount} / 10 kitob
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-[#0B0E14] overflow-hidden">
          <div
            style={{ width: `${keysPercent}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
          />
        </div>

        {booksRemaining > 0 ? (
          <p className="text-[11px] text-slate-300 font-medium">
            Yana <b>{booksRemaining} ta kitob</b> o‘qilsa, sizga katta mukofotli <b>Oltin Keys</b> ochiladi! 🎁
          </p>
        ) : (
          <p className="text-[11px] text-emerald-400 font-bold">
            🎉 Tabriklaymiz! Siz 10 ta kitob o‘qib Oltin Keysni ochdingiz!
          </p>
        )}
      </div>

      {/* 3. Action Tiles (Referral Invite Hub & Daily Bonus) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Referral Invite Tile */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setIsReferralModalOpen(true);
          }}
          className="p-3.5 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-black shadow-lg shadow-orange-500/20 text-left relative overflow-hidden active:scale-95 transition-all group"
        >
          <div className="p-2 rounded-xl bg-black/20 w-fit backdrop-blur-sm mb-2 text-white">
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-black text-xs text-black">Do‘st Taklif Qilish</div>
          <div className="text-[10px] text-black/80 font-bold mt-0.5">+50 Coin & Kindle 🎁</div>
        </button>

        {/* Daily Bonus Tile */}
        {user?.canClaimDailyBonus ? (
          <button
            onClick={handleClaimDailyBonus}
            disabled={claimingBonus}
            className="p-3.5 rounded-3xl bg-[#141B29] border border-[#2A3752] hover:border-amber-500/50 shadow-xs text-left relative overflow-hidden active:scale-95 transition-all group"
          >
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 w-fit mb-2">
              <Gift className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-xs text-white">Kunlik Bonus</div>
            <div className="text-[10px] text-amber-400 font-bold mt-0.5">+50 Coin olish 🪙</div>
          </button>
        ) : (
          <div className="p-3.5 rounded-3xl bg-[#141B29] border border-[#232F47] text-left opacity-70">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-400 w-fit mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-xs text-slate-300">Bonus Olingan</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              ~{user?.hoursUntilNextBonus || 12} soat qoldi
            </div>
          </div>
        )}
      </div>

      {/* 4. Hero Carousel Banner */}
      {banners.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#1E293B] bg-[#141B29]">
          <div className="relative h-40 w-full">
            <img
              src={banners[activeBannerIdx]?.image_url}
              alt="Banner"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/60 to-transparent flex flex-col justify-end p-4 text-white">
              {banners[activeBannerIdx]?.badge && (
                <span className="w-fit px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider mb-1 shadow-sm">
                  {banners[activeBannerIdx]?.badge}
                </span>
              )}
              <h3 className="font-extrabold text-sm leading-tight text-white">
                {banners[activeBannerIdx]?.title}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5 font-medium line-clamp-1">
                {banners[activeBannerIdx]?.subtitle}
              </p>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-2 right-4 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveBannerIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  activeBannerIdx === i ? 'w-4 bg-amber-500' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. Real Books Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-sm text-white">Mavjud Kitoblar ({popularBooks.length})</h3>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('library');
            }}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
          >
            <span>Kutubxona</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {popularBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => {
                triggerHaptic('light');
                openReader(book);
              }}
              className="bg-[#141B29] rounded-3xl border border-[#232F47] shadow-sm hover:border-amber-500/40 transition-all p-3 space-y-2 cursor-pointer flex flex-col justify-between group"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900">
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {book.is_unlocked === 1 ? (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black shadow-sm">
                    Ochilgan ✨
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black shadow-sm flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> 50 bet bepul
                  </span>
                )}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-amber-400 text-[10px] font-extrabold shadow-xs flex items-center gap-1 backdrop-blur-sm border border-[#334155]">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{book.rating_avg}</span>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                  {book.title}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{book.author}</p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#1E293B] text-[10px]">
                <span className="text-slate-400 font-semibold">{book.pages_count} bet</span>
                <span className="font-bold text-amber-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  O‘qish <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Modal */}
      {isReferralModalOpen && <ReferralModal onClose={() => setIsReferralModalOpen(false)} />}
    </div>
  );
};
