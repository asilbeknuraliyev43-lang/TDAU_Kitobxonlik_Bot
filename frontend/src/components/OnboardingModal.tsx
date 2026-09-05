import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { Sparkles, User, Phone, CheckCircle2, BookOpen } from 'lucide-react';
import { triggerHaptic } from '../services/telegram.js';
import confetti from 'canvas-confetti';

export const OnboardingModal: React.FC = () => {
  const { user, refreshUserData, showToast } = useApp();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '+998 ');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.is_profile_completed === 1 || dismissed) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      showToast('Iltimos, to‘liq ismingizni kiriting', 'warning');
      return;
    }

    try {
      setLoading(true);
      triggerHaptic('medium');
      const res = await api.updateProfile(fullName.trim(), phone.trim());
      showToast(res.message, 'success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      await refreshUserData();
      setDismissed(true);
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-slate-800">
      <div className="bg-white w-full max-w-sm rounded-3xl border border-blue-100 shadow-2xl p-6 space-y-4 animate-scale-up text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
          <BookOpen className="w-8 h-8 text-white" />
        </div>

        <div>
          <h3 className="font-black text-lg text-slate-900">Xush kelibsiz! 👋</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Kitobxon ilovasiga xush kelibsiz. Sovg‘alar va sertifikatlarga ega bo‘lish uchun profilingizni to‘ldiring:
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Ism va Familiyangiz *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ism Familiya"
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Telefon raqamingiz *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 font-mono transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 mt-3"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Saqlanmoqda...' : 'Boshlash (50 Coin bilan)'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
