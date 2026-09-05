import React from 'react';
import { useApp, TabType } from '../context/AppContext.js';
import { Home, BookOpen, Trophy, Award, ShoppingBag, User } from 'lucide-react';
import { triggerHaptic } from '../services/telegram.js';

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Asosiy', icon: <Home className="w-5 h-5" /> },
    { id: 'contest', label: 'Tanlov', icon: <Trophy className="w-5 h-5" /> },
    { id: 'cup', label: 'Kubok', icon: <Award className="w-5 h-5" /> },
    { id: 'market', label: 'Market', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'library', label: 'Kutubxona', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'profile', label: 'Sahifam', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0E14]/95 backdrop-blur-2xl border-t border-[#1C2536] px-2 py-1.5 max-w-md mx-auto shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all select-none ${
                isActive
                  ? 'text-amber-500 font-extrabold scale-105'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-amber-500/15 text-amber-500 shadow-sm shadow-amber-500/10' : ''
                }`}
              >
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
