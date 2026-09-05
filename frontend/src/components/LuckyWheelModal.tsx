import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { X, Sparkles, Gift, Disc, CheckCircle2, Clock } from 'lucide-react';
import { triggerHaptic } from '../services/telegram.js';
import confetti from 'canvas-confetti';

interface LuckyWheelModalProps {
  onClose: () => void;
}

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({ onClose }) => {
  const { user, coinBalance, updateCoinBalance, refreshUserData, showToast } = useApp();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<number | null>(null);

  const canSpin = user?.canLuckySpin ?? true;
  const hoursLeft = user?.hoursUntilNextSpin ?? 0;

  const handleSpin = async () => {
    if (spinning || !canSpin) return;

    try {
      setSpinning(true);
      triggerHaptic('medium');
      const res = await api.luckySpin();

      // Random 4-6 full spins plus prize offset
      const prizeAngles: { [key: number]: number } = {
        10: 45,
        20: 105,
        25: 165,
        50: 225,
        100: 315,
      };
      const angle = prizeAngles[res.wonCoins] || 45;
      const totalRotation = rotation + 1800 + angle;
      setRotation(totalRotation);

      setTimeout(() => {
        setSpinning(false);
        setWonPrize(res.wonCoins);
        updateCoinBalance(res.newBalance);
        triggerHaptic('success');
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast(res.message, 'success');
        refreshUserData();
      }, 3500);
    } catch (err: any) {
      setSpinning(false);
      showToast(err.message || 'Xatolik yuz berdi', 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl border border-blue-100 shadow-2xl p-5 space-y-4 animate-scale-up text-center relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-left">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Omadli G‘ildirak</h3>
              <p className="text-[10px] text-slate-400">Har 24 soatda bepul Coin yuting</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wheel Display */}
        <div className="relative w-56 h-56 mx-auto my-2 flex items-center justify-center">
          {/* Pointer */}
          <div className="absolute -top-2 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-500 drop-shadow-md" />

          {/* Rotating Wheel */}
          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
            }}
            className="w-52 h-52 rounded-full border-4 border-white shadow-xl relative overflow-hidden flex items-center justify-center bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600"
          >
            {/* Slices representation */}
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">
              <span className="absolute top-3 text-amber-200">100 Coin</span>
              <span className="absolute bottom-3 text-amber-200">25 Coin</span>
              <span className="absolute left-3 text-white">10 Coin</span>
              <span className="absolute right-3 text-white">50 Coin</span>
              <span className="absolute top-10 right-7 text-white text-[10px]">20 Coin</span>
            </div>

            {/* Center Pin */}
            <div className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-blue-200 flex items-center justify-center z-10 text-xl">
              🎁
            </div>
          </div>
        </div>

        {/* Result or Spin Button */}
        {wonPrize !== null ? (
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-1 animate-scale-up">
            <p className="text-xs font-bold text-blue-900">
              Tabriklaymiz! Siz <span className="text-blue-600 font-extrabold">+{wonPrize} Coin</span> yutib oldingiz! 🎉
            </p>
            <p className="text-[10px] text-slate-500">Joriy balansingiz: {coinBalance.toLocaleString()} Coin</p>
          </div>
        ) : canSpin ? (
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Disc className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
            <span>{spinning ? 'Aylanmoqda...' : 'G‘ildirakni Aylantirish'}</span>
          </button>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Keyingi bepul aylantirish: ~{hoursLeft || 12} soatdan keyin</span>
          </div>
        )}
      </div>
    </div>
  );
};
