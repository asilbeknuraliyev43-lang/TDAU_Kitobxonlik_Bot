import React, { useState } from 'react';
import { api } from '../services/api.js';
import { triggerHaptic } from '../services/telegram.js';
import { ShieldAlert, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  missingChannels: Array<{ name: string; username: string; url: string }>;
  onSubscribed: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const ALL_CHANNELS = [
  { name: '1️⃣ TDAU Tafakkur Hamjamiyati', username: '@TDAU_tafakkur_hamjamiyati', url: 'https://t.me/TDAU_tafakkur_hamjamiyati' },
  { name: '2️⃣ Kitobxonlik Akademiyasi', username: '@Kitobxonlik_akademiyasi', url: 'https://t.me/Kitobxonlik_akademiyasi' },
  { name: '3️⃣ TDAU Tafakkur', username: '@tdau_tafakkur', url: 'https://t.me/tdau_tafakkur' },
  { name: '4️⃣ TDAU Sayohat', username: '@tdau_sayohat', url: 'https://t.me/tdau_sayohat' },
];

export const ChannelSubscriptionModal: React.FC<Props> = ({ missingChannels, onSubscribed, showToast }) => {
  const [checking, setChecking] = useState(false);
  const [missingList, setMissingList] = useState(missingChannels);

  const missingUsernames = new Set((missingList || []).map((c) => c.username));

  const handleCheck = async () => {
    try {
      setChecking(true);
      triggerHaptic('medium');
      const res = await api.checkChannels();

      if (res.isSubscribed) {
        triggerHaptic('success');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast('✅ Barcha kanallarga a\'zolik tasdiqlandi! Xush kelibsiz!', 'success');
        await onSubscribed();
      } else {
        triggerHaptic('error');
        setMissingList(res.missingChannels || []);
        showToast(
          `⚠️ Siz hali ${res.missingChannels.length} ta kanalga a'zo bo‘lmadingiz! Iltimos, barchasiga a'zo bo‘ling.`,
          'error'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Tekshirishda xatolik yuz berdi', 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in text-slate-100 select-none">
      <div className="bg-[#121824] w-full max-w-sm rounded-[32px] border-2 border-amber-500/40 shadow-2xl p-6 space-y-4 animate-scale-up text-center relative overflow-hidden">
        {/* Amber glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center text-black shadow-lg shadow-orange-500/25">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">
            Kanallarga A'zo Bo‘lish Shart!
          </h2>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            🏛️ <b>TDAU Kitobxonlik Akademiyasi</b>dan foydalanish va kitoblarni mutolaa qilish uchun quyidagi 4 ta rasmiy kanalga a'zo bo‘ling:
          </p>
        </div>

        {/* Channels List */}
        <div className="space-y-2 text-left">
          {ALL_CHANNELS.map((ch) => {
            const isMissing = missingUsernames.has(ch.username);
            return (
              <a
                key={ch.username}
                href={ch.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => triggerHaptic('light')}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-xs font-bold active:scale-95 ${
                  isMissing
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{ch.name}</span>
                </div>
                {isMissing ? (
                  <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    <span>A'zo bo‘lish</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>A'zo</span>
                  </span>
                )}
              </a>
            );
          })}
        </div>

        {/* Verify Action Button */}
        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold text-sm shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Tekshirilmoqda...' : '✅ Obunani Tekshirish'}</span>
        </button>

        <p className="text-[10px] text-slate-400">
          Kanallarga qo‘shilgach, yuqoridagi tugmani bosing.
        </p>
      </div>
    </div>
  );
};
