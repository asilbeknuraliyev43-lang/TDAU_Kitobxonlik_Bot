import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { X, Crown, CheckCircle2, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../services/telegram.js';
import confetti from 'canvas-confetti';

export const PremiumModal: React.FC = () => {
  const { isPremiumModalOpen, setIsPremiumModalOpen, coinBalance, updateCoinBalance, refreshUserData, showToast } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  if (!isPremiumModalOpen) return null;

  const plans = [
    {
      months: 1,
      cost: 1500,
      label: '1 Oylik',
      badge: 'Mashhur',
      badgeClass: 'bg-amber-500 text-black',
    },
    {
      months: 3,
      cost: 3500,
      label: '3 Oylik',
      badge: '15% Tejamkor',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    },
    {
      months: 12,
      cost: 10000,
      label: '1 Yillik',
      badge: '30% Chegirma',
      badgeClass: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40',
    },
  ];

  const handleUpgrade = async () => {
    const plan = plans.find((p) => p.months === selectedPlan);
    if (!plan) return;

    if (coinBalance < plan.cost) {
      showToast(`Coinlar yetarli emas! Sizda: ${coinBalance.toLocaleString()} Coin (Kerak: ${plan.cost.toLocaleString()} Coin)`, 'warning');
      return;
    }

    try {
      setLoading(true);
      triggerHaptic('medium');
      const res = await api.upgradePremium(plan.months);
      triggerHaptic('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      showToast(`Tabriklaymiz! ${plan.label} Premium a'zolik faollashtirildi! 👑`, 'success');
      await refreshUserData();
      setIsPremiumModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#121824] w-full max-w-sm rounded-[32px] border border-[#2A3752] shadow-2xl p-5 space-y-4 animate-scale-up relative overflow-hidden">
        {/* Top Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight leading-tight">
                Kitobxon Premium
              </h3>
              <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
                EKSKLYUZIV IMTIYOZLAR
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsPremiumModalOpen(false);
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Features Box */}
        <div className="p-4 rounded-2xl bg-[#0B0E14] border border-[#1E293B] space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-200 font-medium leading-tight">
              Barcha maxsus test va viktorinalarga cheksiz kirish
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-200 font-medium leading-tight">
              Testlardan 2 barobar ko‘proq tanga (coin) yutish
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-200 font-medium leading-tight">
              Maxsus oltin "PRO" profil nishoni va sertifikatlar
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-200 font-medium leading-tight">
              Haftalik yirik sovrinlar tanlovida ustunlik
            </span>
          </div>
        </div>

        {/* 3. Horizontal 3-Column Plan Cards */}
        <div className="grid grid-cols-3 gap-2">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.months;
            return (
              <div
                key={p.months}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedPlan(p.months);
                }}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-between text-center relative pt-4 min-h-[96px] ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15'
                    : 'border-[#232F47] bg-[#0B0E14] hover:border-amber-500/40'
                }`}
              >
                {/* Top Badge */}
                <span
                  className={`absolute -top-2.5 px-2 py-0.5 rounded-full font-black text-[8px] whitespace-nowrap shadow-xs ${p.badgeClass}`}
                >
                  {p.badge}
                </span>

                <div className="font-extrabold text-xs text-white mt-1">{p.label}</div>

                <div className="flex items-center gap-1 font-black text-xs text-amber-400 mt-1">
                  <span className="text-xs">🪙</span>
                  <span>{p.cost.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Bottom Action Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Faollashtirilmoqda...' : 'Premiumga O‘tish'}</span>
        </button>
      </div>
    </div>
  );
};
