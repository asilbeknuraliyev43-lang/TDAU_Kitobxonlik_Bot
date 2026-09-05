import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  Shield,
  BookPlus,
  Trophy,
  CheckCircle,
  XCircle,
  ShoppingBag,
  Users,
  Star,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';

export const AdminDashboard: React.FC = () => {
  const { showToast } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'books' | 'reviews' | 'orders'>('books');

  // Book Form
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Badiiy');
  const [price, setPrice] = useState(48000);
  const [pagesCount, setPagesCount] = useState(200);
  const [previewPages, setPreviewPages] = useState(10);
  const [unlockPriceCoins, setUnlockPriceCoins] = useState(150);
  const [sampleContent, setSampleContent] = useState('');
  const [creatingBook, setCreatingBook] = useState(false);

  // Reviews & Orders
  const [reviews, setReviews] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.getAdminStats();
      setStats(res);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReviews = async () => {
    try {
      const res = await api.getAdminReviews();
      setReviews(res.reviews);
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.getAdminOrders();
      setOrders(res.orders);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingBook(true);
      await api.createAdminBook({
        title,
        author,
        cover_url: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80',
        description,
        category,
        price,
        pages_count: pagesCount,
        preview_pages: previewPages,
        unlock_price_coins: unlockPriceCoins,
        sample_content: sampleContent,
      });

      showToast('Kitob muvaffaqiyatli qo‘shildi!', 'success');
      setTitle('');
      setAuthor('');
      setCoverUrl('');
      setDescription('');
      setSampleContent('');
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setCreatingBook(false);
    }
  };

  const handleUpdateReviewStatus = async (reviewId: number, status: 'tasdiqlangan' | 'rad_etilgan') => {
    try {
      triggerHaptic('light');
      await api.moderateAdminReview(reviewId, status === 'tasdiqlangan');
      showToast(`Sharh ${status === 'tasdiqlangan' ? 'tasdiqlandi' : 'rad etildi'}`, 'success');
      loadReviews();
    } catch (err: any) {
      showToast(err.message || 'Xatolik', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: 'bajarildi' | 'bekor_qilindi') => {
    try {
      triggerHaptic('light');
      await api.updateAdminOrderStatus(orderId, status);
      showToast(`Buyurtma holati yangilandi`, 'success');
      loadOrders();
    } catch (err: any) {
      showToast(err.message || 'Xatolik', 'error');
    }
  };

  return (
    <div className="pb-24 px-4 pt-3 space-y-4 animate-fade-in text-slate-100 bg-[#0B0E14] min-h-screen">
      {/* Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 text-black shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-black" />
            <h3 className="font-black text-sm text-white">Akademiya Boshqaruv Markazi</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-black text-amber-400 text-[9px] font-black uppercase">
            ADMIN 👑
          </span>
        </div>
        <p className="text-xs text-black/90 font-bold">
          Kitoblarni boshqarish, sharhlarni moderatsiya qilish va buyurtmalarni kuzatish.
        </p>
      </div>

      {/* Stats Summary Grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] text-center space-y-0.5">
            <div className="font-black text-base text-amber-400">{stats.usersCount}</div>
            <div className="text-[9px] text-slate-400 font-bold">Foydalanuvchilar</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] text-center space-y-0.5">
            <div className="font-black text-base text-white">{stats.booksCount}</div>
            <div className="text-[9px] text-slate-400 font-bold">Kitoblar</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] text-center space-y-0.5">
            <div className="font-black text-base text-orange-400">{stats.readingHours}s</div>
            <div className="text-[9px] text-slate-400 font-bold">O‘qish vaqti</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl bg-[#141B29] border border-[#232F47] text-xs font-bold">
        <button
          onClick={() => setActiveTab('books')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'books'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-xs font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ➕ Kitob qo‘shish
        </button>
        <button
          onClick={() => {
            setActiveTab('reviews');
            loadReviews();
          }}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'reviews'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-xs font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ⭐ Sharhlar
        </button>
        <button
          onClick={() => {
            setActiveTab('orders');
            loadOrders();
          }}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-xs font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📦 Buyurtmalar
        </button>
      </div>

      {activeTab === 'books' && (
        <form onSubmit={handleCreateBook} className="p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xs space-y-3">
          <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
            <BookPlus className="w-4 h-4 text-amber-500" />
            <span>Yangi Kitob Qo‘shish</span>
          </h4>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Kitob nomi *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Yulduzli tunlar"
              className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#232F47] text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Muallif *</label>
            <input
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Pirimqul Qodirov"
              className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#232F47] text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Kategoriya</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#232F47] text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="Badiiy">Badiiy</option>
                <option value="Rivojlanish">Rivojlanish</option>
                <option value="Klassika">Klassika</option>
                <option value="Psixologiya">Psixologiya</option>
                <option value="Tarixiy">Tarixiy</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Ochish narxi (Coin)</label>
              <input
                type="number"
                value={unlockPriceCoins}
                onChange={(e) => setUnlockPriceCoins(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0E14] border border-[#232F47] text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creatingBook}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all mt-2"
          >
            {creatingBook ? 'Qo‘shilmoqda...' : 'Kitobni Saqlash'}
          </button>
        </form>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-2">
          {reviews.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-[#141B29] rounded-3xl border border-[#232F47]">
              Hozircha moderatsiyadagi sharhlar yo‘q
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="p-3.5 rounded-2xl bg-[#141B29] border border-[#232F47] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white">{rev.user_name}</span>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{rev.rating}</span>
                  </div>
                </div>
                <p className="text-slate-300 text-[11px]">{rev.comment_text}</p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleUpdateReviewStatus(rev.id, 'tasdiqlangan')}
                    className="flex-1 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Tasdiqlash
                  </button>
                  <button
                    onClick={() => handleUpdateReviewStatus(rev.id, 'rad_etilgan')}
                    className="flex-1 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rad etish
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-[#141B29] rounded-3xl border border-[#232F47]">
              Hozircha buyurtmalar yo‘q
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="p-3.5 rounded-2xl bg-[#141B29] border border-[#232F47] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white">{ord.item_title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                    {ord.status}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  👤 Mijoz: {ord.user_name} | 📱 Tel: {ord.phone}
                </div>
                <div className="text-slate-400 text-[11px]">
                  📍 Manzil: {ord.address}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleUpdateOrderStatus(ord.id, 'bajarildi')}
                    className="flex-1 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Bajarildi
                  </button>
                  <button
                    onClick={() => handleUpdateOrderStatus(ord.id, 'bekor_qilindi')}
                    className="flex-1 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Bekor qilish
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
