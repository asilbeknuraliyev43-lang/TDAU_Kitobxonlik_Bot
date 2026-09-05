import React, { useState } from 'react';
import { Book } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import { X, CheckCircle2, ShoppingBag, Phone, MapPin, FileText } from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import confetti from 'canvas-confetti';

interface PhysicalOrderModalProps {
  book: Book;
  onClose: () => void;
}

export const PhysicalOrderModal: React.FC<PhysicalOrderModalProps> = ({ book, onClose }) => {
  const { user, showToast } = useApp();
  const [phone, setPhone] = useState(user?.phone_number || '+998 ');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 7) {
      showToast('Telefon raqamingizni to‘liq kiriting', 'warning');
      return;
    }
    if (!address || address.trim().length < 5) {
      showToast('Yetkazib berish manzilini kiriting', 'warning');
      return;
    }

    try {
      setLoading(true);
      triggerHaptic('medium');
      const res = await api.orderPhysicalBook(book.id, { phone, address, notes });
      showToast(res.message, 'success');
      triggerHaptic('success');
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#121824] w-full max-w-sm rounded-3xl border border-[#232F47] shadow-2xl p-5 space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Kitobga buyurtma berish</h3>
              <p className="text-[10px] text-slate-400">Qog‘oz nusxasini xarid qilish</p>
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

        {/* Book Preview Card */}
        <div className="p-3.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] flex items-center gap-3">
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-14 h-18 object-cover rounded-xl shadow-xs"
          />
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-xs text-white line-clamp-1">{book.title}</h4>
            <p className="text-[10px] text-slate-400">{book.author}</p>
            <div className="text-xs font-black text-amber-400 pt-1">
              {book.price?.toLocaleString()} so‘m
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Telefon raqamingiz *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Yetkazib berish manzili (Shahar, tuman, ko‘cha, uy) *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Toshkent sh., Chilonzor tumani..."
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Qo‘shimcha izoh (ixtiyoriy)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eslatma yoki qulay vaqt"
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Buyurtma berilmoqda...' : 'Buyurtmani Tasdiqlash'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
