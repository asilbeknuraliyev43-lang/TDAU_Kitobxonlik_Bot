import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { X, Copy, Check, Share2, Volume2, Shield, Sparkles, Headphones } from 'lucide-react';
import { triggerHaptic, openTelegramChat } from '../../services/telegram.js';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const referralLink = user?.referralLink || `https://t.me/tdau_kitobxonlik_bot?start=r_${user?.telegram_id || '185791049'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    triggerHaptic('light');
    showToast('Havola nusxalandi!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    triggerHaptic('medium');
    const text = encodeURIComponent(
      `🏛️ Salom! Men TDAU KITOBXONLIK AKADEMIYASI da kitob o‘qib, Coinlar ishlayapman. Siz ham qo‘shiling:\n${referralLink}`
    );
    window.open(`https://t.me/share/url?url=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#121824] w-full max-w-sm rounded-3xl border border-[#232F47] shadow-2xl p-5 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
          <h3 className="font-extrabold text-sm text-white">Sozlamalar va Qo‘llab-quvvatlash</h3>
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

        {/* Referral Card */}
        <div className="p-4 rounded-2xl bg-[#0B0E14] border border-[#232F47] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs text-white">Sizning referal havolangiz</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black">
              +50 Coin
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#161D2B] border border-[#2A3752] text-[11px] font-mono text-amber-400 truncate">
            <span className="truncate flex-1">{referralLink}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-[#222E44] hover:bg-[#2C3B57] text-white shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Telegramda Ulashish</span>
          </button>
        </div>

        {/* Support Card @Tdau_admin */}
        <div
          onClick={() => openTelegramChat('https://t.me/Tdau_admin')}
          className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] hover:border-amber-500/40 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">Admin bilan bog‘lanish</div>
              <div className="text-[10px] text-amber-400 font-mono">@Tdau_admin</div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Yozish →</span>
        </div>

        {/* Toggles */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0B0E14] border border-[#232F47]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>Vibratsiya (Haptic Feedback)</span>
            </div>
            <input
              type="checkbox"
              checked={hapticsEnabled}
              onChange={(e) => setHapticsEnabled(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-[#141B29] hover:bg-[#1C2538] text-slate-300 font-bold text-xs border border-[#232F47]"
        >
          Yopish
        </button>
      </div>
    </div>
  );
};
