import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { NotificationItem } from '../types/index.js';
import { X, Bell, Sparkles, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../services/telegram.js';

export const NotificationModal: React.FC = () => {
  const { isNotificationOpen, setIsNotificationOpen } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNotificationOpen) {
      loadNotifications();
    }
  }, [isNotificationOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isNotificationOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#121824] w-full max-w-sm rounded-3xl border border-[#232F47] shadow-2xl p-5 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Bildirishnomalar</h3>
              <p className="text-[10px] text-slate-400">Yangi aksiyalar va xabarlar</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsNotificationOpen(false);
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Yuklanmoqda...</div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="p-3.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-amber-400">{n.title}</h4>
                  <span className="text-[9px] text-slate-500">{n.time}</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">{n.message}</p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setIsNotificationOpen(false)}
          className="w-full py-2.5 rounded-2xl bg-[#141B29] hover:bg-[#1C2538] text-slate-300 font-bold text-xs border border-[#232F47]"
        >
          Yopish
        </button>
      </div>
    </div>
  );
};
