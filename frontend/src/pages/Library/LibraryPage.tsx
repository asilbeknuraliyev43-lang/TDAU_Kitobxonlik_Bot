import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Book } from '../../types/index.js';
import {
  Search,
  BookOpen,
  Star,
  Lock,
  Heart,
  ChevronRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import { BookDetailPage } from './BookDetailPage.js';

export const LibraryPage: React.FC = () => {
  const { openReader, refreshUserData } = useApp();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  const categories = ['Barchasi', 'Badiiy', 'Rivojlanish', 'Klassika', 'Tarixiy', 'Psixologiya'];

  useEffect(() => {
    loadBooks();
  }, [selectedCategory, searchQuery]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const res = await api.getBooks(selectedCategory, searchQuery);
      setBooks(res.books);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, bookId: number) => {
    e.stopPropagation();
    try {
      triggerHaptic('light');
      const res = await api.toggleFavorite(bookId);
      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, is_favorite: res.is_favorite } : b))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pb-24 px-4 pt-3 space-y-4 animate-fade-in text-slate-100 bg-[#0B0E14] min-h-screen">
      {/* Search Header */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Kitob nomi yoki muallif bo‘yicha qidiruv..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#141B29] border border-[#232F47] shadow-xs text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              triggerHaptic('light');
              setSelectedCategory(cat);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all select-none ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-orange-500/20 font-black'
                : 'bg-[#141B29] text-slate-300 border border-[#232F47] hover:border-amber-500/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
          Kitoblar yuklanmoqda...
        </div>
      ) : books.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 bg-[#141B29] rounded-3xl border border-[#232F47]">
          Hech qanday kitob topilmadi
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => {
                triggerHaptic('light');
                setSelectedBookForDetail(book);
              }}
              className="bg-[#141B29] rounded-3xl border border-[#232F47] shadow-sm hover:border-amber-500/40 transition-all p-3 space-y-2 cursor-pointer flex flex-col justify-between group"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900">
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Favorite Button */}
                <button
                  onClick={(e) => handleToggleFavorite(e, book.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 backdrop-blur-md text-slate-400 hover:text-rose-500 transition-colors shadow-xs border border-[#334155]"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      book.is_favorite === 1 ? 'fill-rose-500 text-rose-500' : ''
                    }`}
                  />
                </button>

                {/* Unlock badge */}
                {book.is_unlocked === 1 ? (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black shadow-sm">
                    Ochilgan ✨
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black shadow-sm flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> 50 bet bepul
                  </span>
                )}

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/80 text-amber-400 text-[10px] font-extrabold shadow-xs flex items-center gap-1 border border-[#334155]">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{book.rating_avg}</span>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                  {book.title}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{book.author}</p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#1E293B] text-[10px]">
                <span className="text-slate-400 font-semibold">{book.pages_count} bet</span>
                <span className="font-bold text-amber-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Batafsil <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBookForDetail && (
        <BookDetailPage
          bookId={selectedBookForDetail.id}
          onClose={() => {
            setSelectedBookForDetail(null);
            loadBooks();
          }}
          onStartReading={(bookToRead) => {
            setSelectedBookForDetail(null);
            openReader(bookToRead);
          }}
        />
      )}
    </div>
  );
};
