import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import {
  X,
  Share2,
  Copy,
  Check,
  Users,
  Trophy,
  Gift,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram.js';
import confetti from 'canvas-confetti';

interface ReferralModalProps {
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ onClose }) => {
  const { user, stats, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const tgId = user?.telegram_id || '185791049';
  const referralLink = user?.referralLink || `https://t.me/tdau_kitobxonlik_bot?start=r_${tgId}`;

  const referralCount = stats?.referralCount || 0;
  const targetReferrals = 5;
  const contestPercent = Math.min(100, Math.round((referralCount / targetReferrals) * 100));
  const remainingForContest = Math.max(0, targetReferrals - referralCount);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const res = await api.getReferrals();
      setReferralsList(res.referrals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    triggerHaptic('light');
    showToast('Havola nusxalandi!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    triggerHaptic('medium');
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });
    const shareText = encodeURIComponent(
      `🏛️ Salom! Men TDAU KITOBXONLIK AKADEMIYASI da haqiqiy PDF kitoblarni mutolaa qilib, testlar topshiryapman va sovrinlar yutyapman.\n\nSiz ham ushbu havola orqali botga qo‘shiling va bepul kitoblarni o‘qing:\n${referralLink}`
    );
    window.open(`https://t.me/share/url?url=${shareText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#121824] w-full max-w-sm rounded-3xl border border-[#232F47] shadow-2xl p-5 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Do‘stlarni Taklif Qilish</h3>
              <p className="text-[10px] text-amber-400/80 font-bold">Har bir do‘st uchun +50 Coin</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Weekly Contest Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 text-white space-y-2.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-black/30 text-[9px] font-black uppercase tracking-wider">
              HAFTALIK TANLOV
            </span>
            <span className="text-xs font-black text-amber-100">Kindle + 3000 Coin</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Ishtirok holati:</span>
              <span className="font-mono text-amber-200">{referralCount} / 5 do‘st</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden">
              <div
                style={{ width: `${contestPercent}%` }}
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-200 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {remainingForContest > 0 ? (
            <p className="text-[11px] text-amber-100 font-medium leading-tight">
              Yana <b>{remainingForContest} ta do‘st</b> taklif qilsangiz, tanlovning rasmiy ishtirokchisiga aylanasiz! 🏆
            </p>
          ) : (
            <p className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Siz haftalik tanlovda qatnashmoqdasiz!
            </p>
          )}
        </div>

        {/* Referral Link Box */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-300">
            Sizning shaxsiy referal havolangiz:
          </label>
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] text-xs font-mono text-amber-400">
            <span className="truncate flex-1 select-all">{referralLink}</span>
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-[#1A2234] border border-[#2D3C59] hover:bg-[#25324D] text-white shrink-0 transition-colors shadow-xs"
              title="Nusxalash"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Main Share Button */}
        <button
          onClick={handleShare}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>Telegramda Do‘stlarga Ulashish</span>
        </button>

        {/* Invited Friends List */}
        <div className="space-y-2 pt-2 border-t border-[#1E293B]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-white">
              Taklif qilingan do‘stlar ({referralsList.length})
            </span>
            <span className="text-[10px] font-bold text-amber-400">
              +{referralsList.length * 50} Coin yutilgan
            </span>
          </div>

          {loading ? (
            <div className="py-4 text-center text-xs text-slate-500">Yuklanmoqda...</div>
          ) : referralsList.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 bg-[#0B0E14] rounded-2xl border border-[#1A2234]">
              Hozircha do‘stlar taklif qilinmagan
            </div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {referralsList.map((ref, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-2xl bg-[#0B0E14] border border-[#1A2234] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                      {ref.full_name?.[0] || 'D'}
                    </div>
                    <div>
                      <div className="font-bold text-white line-clamp-1">{ref.full_name}</div>
                      <div className="text-[9px] text-slate-500">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="font-extrabold text-amber-400 text-[11px]">+50 Coin</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
