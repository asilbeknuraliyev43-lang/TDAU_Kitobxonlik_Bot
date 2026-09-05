import React, { useEffect, useState } from 'react';
import { Book, Review } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  X,
  Star,
  BookOpen,
  ShoppingBag,
  MessageSquare,
  Lock,
  CheckCircle2,
  Heart,
  Share2,
} from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import { PhysicalOrderModal } from './PhysicalOrderModal.js';
import confetti from 'canvas-confetti';

interface BookDetailPageProps {
  bookId: number;
  onClose: () => void;
  onStartReading: (book: Book) => void;
}

export const BookDetailPage: React.FC<BookDetailPageProps> = ({
  bookId,
  onClose,
  onStartReading,
}) => {
  const { coinBalance, updateCoinBalance, refreshUserData, showToast } = useApp();
  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Review Form
  const [rating, setRating] = useState(5);
  const [commentText, setCommentText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadDetail();
  }, [bookId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await api.getBookDetail(bookId);
      setBook(res.book);
      setReviews(res.reviews);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!book) return;
    const cost = book.unlock_price_coins || 150;

    if (coinBalance < cost) {
      showToast(`Coin yetarli emas! Narxi: ${cost} Coin (Sizda: ${coinBalance} Coin)`, 'warning');
      return;
    }

    try {
      setUnlocking(true);
      triggerHaptic('medium');
      const res = await api.unlockBook(book.id);
      setBook({ ...book, is_unlocked: 1 });
      updateCoinBalance(res.newBalance);
      triggerHaptic('success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast(res.message, 'success');
      refreshUserData();
    } catch (err: any) {
      showToast(err.message || 'Xaridda xatolik yuz berdi', 'error');
    } finally {
      setUnlocking(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingReview(true);
      triggerHaptic('medium');
      const res = await api.submitReview(bookId, rating, commentText);
      showToast(res.message, res.coinsEarned > 0 ? 'success' : 'info');
      setCommentText('');
      loadDetail();
      refreshUserData();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading || !book) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="p-4 rounded-2xl bg-[#141B29] text-xs font-bold text-slate-300 border border-[#232F47] shadow-xl">
          Kitob ma'lumotlari yuklanmoqda...
        </div>
      </div>
    );
  }

  const unlockCost = book.unlock_price_coins || 150;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0E14] animate-fade-in overflow-y-auto text-slate-100">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-[#0B0E14]/90 backdrop-blur-md border-b border-[#1C2536] flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 rounded-2xl bg-[#141B29] hover:bg-[#1C2538] text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-extrabold text-xs text-white">Kitob Tafsilotlari</span>
        <div className="w-9" />
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Book Header Card */}
        <div className="flex gap-4 p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-lg">
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-28 h-40 object-cover rounded-2xl shadow-md shrink-0 bg-slate-900"
          />
          <div className="flex flex-col justify-between py-1 min-w-0">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold uppercase border border-amber-500/30">
                {book.category}
              </span>
              <h3 className="font-black text-sm text-white leading-tight line-clamp-2">{book.title}</h3>
              <p className="text-xs text-slate-400 font-medium line-clamp-1">{book.author}</p>
            </div>

            <div className="flex items-center gap-3 text-xs pt-2">
              <div className="flex items-center gap-1 font-bold text-amber-400">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{book.rating_avg}</span>
                <span className="text-[10px] text-slate-500">({book.reviews_count})</span>
              </div>
              <div className="text-slate-600">•</div>
              <div className="font-semibold text-slate-400">{book.pages_count} sahifa</div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Read & Buy */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onStartReading(book)}
            className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Mutolaa qilish</span>
          </button>

          {book.is_unlocked === 1 ? (
            <div className="py-3.5 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold text-xs flex items-center justify-center gap-1.5 select-none">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>To‘liq ochilgan</span>
            </div>
          ) : (
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="py-3.5 px-4 rounded-2xl bg-[#141B29] border border-amber-500/40 hover:bg-[#1C2538] text-amber-400 font-extrabold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>{unlocking ? 'Ochilmoqda...' : `Ochish (${unlockCost} Coin)`}</span>
            </button>
          )}
        </div>

        {/* Physical Paper Book Purchase */}
        <div className="p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-xs text-white">Qog‘oz kitob xaridi</h4>
            <p className="text-[10px] text-slate-400">Uyga bepul yetkazib berish bilan</p>
            <div className="text-xs font-black text-amber-400 pt-0.5">
              {book.price?.toLocaleString()} so‘m
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsOrderModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-black active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/20"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Buyurtma</span>
          </button>
        </div>

        {/* Description */}
        <div className="p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xs space-y-2">
          <h4 className="font-extrabold text-xs text-white">Kitob haqida</h4>
          <p className="text-xs text-slate-300 leading-relaxed">{book.description}</p>
        </div>

        {/* Reviews Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>Sharhlar ({reviews.length})</span>
            </h4>
            <span className="text-[10px] font-bold text-amber-400">Sharh uchun +10 Coin</span>
          </div>

          {/* Add Review Form */}
          <form onSubmit={handleReviewSubmit} className="p-4 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xs space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              required
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Kitob haqida fikringizni yozing (+10 Coin)..."
              className="w-full p-3 rounded-2xl bg-[#0B0E14] border border-[#232F47] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs shadow-xs active:scale-95 transition-all"
            >
              {submittingReview ? 'Yuborilmoqda...' : 'Sharh qoldirish'}
            </button>
          </form>

          {/* Reviews List */}
          <div className="space-y-2">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-3 rounded-2xl bg-[#141B29] border border-[#232F47] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-white">
                    {rev.full_name || 'Kitobxon'}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400">{rev.rating}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-normal">{rev.comment_text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Physical Order Modal */}
      {isOrderModalOpen && (
        <PhysicalOrderModal book={book} onClose={() => setIsOrderModalOpen(false)} />
      )}
    </div>
  );
};
