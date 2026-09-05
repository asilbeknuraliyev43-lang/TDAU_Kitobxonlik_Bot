import React from 'react';
import { useApp } from '../context/AppContext.js';
import { BookOpen, Bell, Search, Shield } from 'lucide-react';
import { triggerHaptic } from '../services/telegram.js';

export const Header: React.FC = () => {
  const {
    coinBalance,
    setIsNotificationOpen,
    setIsPremiumModalOpen,
    setActiveTab,
    activeTab,
    user,
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-[#0B0E14]/95 backdrop-blur-xl border-b border-[#1C2536] px-4 py-2.5 flex items-center justify-between shadow-lg">
      {/* Brand Title */}
      <div
        onClick={() => {
          triggerHaptic('light');
          setActiveTab('home');
        }}
        className="flex items-center gap-2.5 cursor-pointer select-none"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-tight text-white">
              KITOB<span className="text-amber-500">XON</span>
            </span>
            {user?.is_premium === 1 && (
              <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[8px] font-black uppercase shadow-xs">
                PRO
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold text-slate-400 block -mt-0.5">
            TDAU Kitobxonlik Akademiyasi
          </span>
        </div>
      </div>

      {/* Right Controls: Coin Balance Capsule & Bell */}
      <div className="flex items-center gap-2">
        {/* Coin Balance Capsule */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setIsPremiumModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#182133] hover:bg-[#1E2B42] border border-[#2D3C59] text-white shadow-xs transition-all active:scale-95 select-none"
          title="Coinlar balansi"
        >
          <span className="text-sm">🪙</span>
          <span className="font-black text-xs text-amber-400 tracking-tight">
            {coinBalance.toLocaleString('ru-RU')}
          </span>
        </button>

        {/* Search */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('library');
          }}
          className="p-2 rounded-2xl bg-[#141B29] hover:bg-[#1C2538] text-slate-400 hover:text-white transition-colors"
          title="Qidiruv"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setIsNotificationOpen(true);
          }}
          className="p-2 rounded-2xl bg-[#141B29] hover:bg-[#1C2538] text-slate-400 hover:text-white transition-colors relative"
          title="Bildirishnomalar"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[#0B0E14]" />
        </button>

        {/* Admin Link if Admin */}
        {user?.isAdmin && (
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('admin');
            }}
            className={`p-2 rounded-2xl transition-colors ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-xs font-bold'
                : 'bg-[#141B29] hover:bg-[#1C2538] text-amber-400'
            }`}
            title="Admin Panel"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
