import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { MarketItem, Order } from '../../types/index.js';
import {
  ShoppingBag,
  Gift,
  Award,
  Sparkles,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import confetti from 'canvas-confetti';

export const MarketPage: React.FC = () => {
  const { coinBalance, updateCoinBalance, refreshUserData, showToast, stats } = useApp();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [activeTab, setActiveTab] = useState<'market' | 'orders'>('market');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Buy item modal
  const [selectedItemToBuy, setSelectedItemToBuy] = useState<MarketItem | null>(null);
  const [phone, setPhone] = useState('+998 ');
  const [address, setAddress] = useState('');
  const [buying, setBuying] = useState(false);

  const categories = ['Barchasi', 'kitob', 'gadget', 'promokod'];

  const booksReadCount = stats?.booksCount || 0;

  useEffect(() => {
    loadMarket();
  }, [selectedCategory]);

  const loadMarket = async () => {
    try {
      setLoading(true);
      const res = await api.getMarketItems(selectedCategory);
      setItems(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.getMyOrders();
      setOrders(res.orders);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToBuy) return;

    if (coinBalance < selectedItemToBuy.price_coins) {
      showToast(`Coinlar yetarli emas! Narxi: ${selectedItemToBuy.price_coins.toLocaleString()} Coin`, 'warning');
      return;
    }

    try {
      setBuying(true);
      triggerHaptic('medium');
      const res = await api.buyMarketItem({
        itemId: selectedItemToBuy.id,
        phone,
        address,
      });

      updateCoinBalance(res.coinBalance);
      triggerHaptic('success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast(res.message, 'success');
      setSelectedItemToBuy(null);
      refreshUserData();
      loadMarket();
    } catch (err: any) {
      showToast(err.message || 'Xaridda xatolik yuz berdi', 'error');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="pb-24 px-4 pt-3 space-y-4 animate-fade-in text-slate-100 bg-[#0B0E14] min-h-screen">
      {/* Top Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 text-black shadow-xl space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-black/30 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-md">
            SOVG‘ALAR BOZORI
          </span>
          <div className="text-xs font-bold text-black/90">
            Balans: <b className="text-white">{coinBalance.toLocaleString()} Coin 🪙</b>
          </div>
        </div>

        <div>
          <h3 className="font-black text-base leading-tight text-white">
            Coinlaringizni haqiqiy sovg‘alarga almashtiring!
          </h3>
          <p className="text-xs text-black/90 mt-0.5 font-semibold">
            Qog‘oz kitoblar, audio quloqchinlar va Premium obunalarni xarid qiling.
          </p>
        </div>

        {/* Certificate / Keys Notice */}
        <div className="p-2.5 rounded-2xl bg-black/25 backdrop-blur-sm border border-black/20 text-white text-[11px] font-medium flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            {booksReadCount >= 10 ? (
              <b className="text-amber-200">🎉 Oltin Maxsus Keys ochilgan! Ustoz sertifikati tayyor.</b>
            ) : (
              <span>Rasmiy Sertifikat 10 ta kitob o‘qib <b>Oltin Keys</b> ochilgach taqdim etiladi ({booksReadCount}/10 kitob).</span>
            )}
          </span>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex p-1 rounded-2xl bg-[#141B29] border border-[#232F47] text-xs font-bold">
        <button
          onClick={() => setActiveTab('market')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'market'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🎁 Mahsulotlar
        </button>
        <button
          onClick={() => {
            setActiveTab('orders');
            loadOrders();
          }}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📦 Buyurtmalarim
        </button>
      </div>

      {activeTab === 'market' ? (
        <>
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedCategory(cat);
                }}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                    : 'bg-[#141B29] text-slate-300 border border-[#232F47]'
                }`}
              >
                {cat === 'kitob'
                  ? '📚 Qog‘oz Kitoblar'
                  : cat === 'gadget'
                  ? '🎧 Gadjetlar'
                  : cat === 'promokod'
                  ? '🎟️ Premium Obunalar'
                  : 'Barchasi'}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-[#141B29] rounded-3xl border border-[#232F47] shadow-sm hover:border-amber-500/40 transition-all p-3 space-y-2 flex flex-col justify-between"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-amber-400 text-[11px] font-black shadow-xs border border-[#334155]">
                    🪙 {item.price_coins.toLocaleString()} Coin
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-xs text-white line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium line-clamp-1">
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedItemToBuy(item);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-orange-500/20"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Xarid qilish</span>
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Orders List */
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-[#141B29] rounded-3xl border border-[#232F47]">
              Sizda hali xaridlar yo‘q
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white">{ord.item_title}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                    {ord.status}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Sana: {new Date(ord.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Buy Modal */}
      {selectedItemToBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-slate-100">
          <div className="bg-[#121824] w-full max-w-sm rounded-3xl border border-[#232F47] shadow-2xl p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <h3 className="font-extrabold text-sm text-white">Xaridni tasdiqlash</h3>
              <button
                onClick={() => setSelectedItemToBuy(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#0B0E14] border border-[#232F47] flex items-center justify-between text-xs font-bold">
              <span className="text-white truncate max-w-[180px]">{selectedItemToBuy.title}</span>
              <span className="text-amber-400 font-black">🪙 {selectedItemToBuy.price_coins.toLocaleString()} Coin</span>
            </div>

            <form onSubmit={handleBuy} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Telefon raqamingiz *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Yetkazib berish manzili *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shahar, tuman, ko‘cha, uy"
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#0B0E14] border border-[#232F47] text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={buying}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
              >
                {buying ? 'Xarid qilinmoqda...' : 'Buyurtmani Tasdiqlash'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
