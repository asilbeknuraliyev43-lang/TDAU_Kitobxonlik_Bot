import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Quiz } from '../../types/index.js';
import {
  Trophy,
  Lock,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Award,
} from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import { QuizModal } from './QuizModal.js';

export const CupPage: React.FC = () => {
  const { openReader } = useApp();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const res = await api.getQuizzes();
      setQuizzes(res.quizzes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 px-4 pt-3 space-y-4 animate-fade-in text-slate-100 bg-[#0B0E14] min-h-screen">
      {/* Header Info Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 text-black shadow-xl space-y-1.5 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-white" />
          <h3 className="font-black text-sm text-white">Kubok Testlari va Viktorinalar</h3>
        </div>
        <p className="text-xs text-black/90 leading-relaxed font-bold">
          Kitoblarni mutolaa qilib, test topshiring va har bir testdan <b>+250 Coin</b> gacha mukofot oling! 🎓
        </p>
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
          Testlar yuklanmoqda...
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className={`p-4 rounded-3xl bg-[#141B29] border transition-all ${
                quiz.isUnlocked
                  ? 'border-[#2D3C59] shadow-md hover:border-amber-500/50'
                  : 'border-[#1E293B] opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="relative w-12 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    <img
                      src={quiz.book_cover}
                      alt={quiz.title}
                      className="w-full h-full object-cover"
                    />
                    {!quiz.isUnlocked && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-amber-400">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-white leading-tight">
                      {quiz.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{quiz.book_author}</p>
                    <div className="flex items-center gap-2 pt-0.5 text-[10px]">
                      <span className="font-extrabold text-amber-400">
                        🪙 +{quiz.reward_coins} Coin
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="font-semibold text-slate-400">
                        {quiz.questions_count} ta savol
                      </span>
                    </div>
                  </div>
                </div>

                {quiz.is_completed === 1 && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[9px] flex items-center gap-1 shrink-0 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Topshirilgan
                  </span>
                )}
              </div>

              {/* Unlock Gate Progress Bar if locked */}
              {!quiz.isUnlocked && (
                <div className="mt-3 pt-3 border-t border-[#1E293B] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" /> O‘qish sharti:
                    </span>
                    <span className="font-extrabold text-white">
                      {quiz.user_pages_read || 0} / {quiz.min_pages_required} bet
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0B0E14] overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((quiz.user_pages_read || 0) / quiz.min_pages_required) * 100)
                        )}%`,
                      }}
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-3 pt-2 flex items-center justify-end">
                {quiz.isUnlocked ? (
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setSelectedQuiz(quiz);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <span>Testni Boshlash</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      openReader({
                        id: quiz.book_id || 1,
                        title: quiz.book_title || quiz.title,
                        author: quiz.book_author || '',
                        cover_url: quiz.book_cover,
                        description: quiz.description || '',
                        category: 'Badiiy',
                        price: 0,
                        pages_count: 100,
                        rating_avg: 5,
                        reviews_count: 10,
                        created_at: '',
                      });
                    }}
                    className="px-3.5 py-2 rounded-2xl bg-[#182236] hover:bg-[#1E2B42] text-slate-300 font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 border border-[#2D3C59]"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Kitobni o‘qish ({quiz.pagesRemaining} bet qoldi)</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Modal */}
      {selectedQuiz && (
        <QuizModal
          quizId={selectedQuiz.id}
          onClose={() => {
            setSelectedQuiz(null);
            loadQuizzes();
          }}
        />
      )}
    </div>
  );
};
