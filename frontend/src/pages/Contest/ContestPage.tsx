import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Contest, Quiz } from '../../types/index.js';
import {
  Trophy,
  Users,
  Flame,
  Clock,
  Sparkles,
  Share2,
  Crown,
  Medal,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import { ReferralModal } from '../../components/ReferralModal.js';
import { QuizModal } from '../Cup/QuizModal.js';

export const ContestPage: React.FC = () => {
  const { user, stats, isReferralModalOpen, setIsReferralModalOpen, openQuizForBook } = useApp();
  const [contests, setContests] = useState<Contest[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contestRes, leadRes, quizRes] = await Promise.all([
        api.getContests(),
        api.getLeaderboard(),
        api.getQuizzes(),
      ]);
      setContests(contestRes.contests);
      setLeaderboard(leadRes.leaderboard);
      setQuizzes(quizRes.quizzes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const referralCount = stats?.referralCount || 0;
  const targetReferrals = 5;
  const refPercent = Math.min(100, Math.round((referralCount / targetReferrals) * 100));

  return (
    <div className="pb-24 px-4 pt-3 space-y-4 animate-fade-in text-slate-100 bg-[#0B0E14] min-h-screen">
      {/* 1. Main Weekly Contest Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 text-black shadow-xl space-y-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-black/30 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-md">
            HAFTALIK TANLOV
          </span>
          <div className="flex items-center gap-1 text-[11px] font-bold text-black/80">
            <Clock className="w-3.5 h-3.5" />
            <span>2 kun qoldi</span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="font-black text-lg leading-tight text-white">
            Kindle Paperwhite + 3000 Coin 🏆
          </h3>
          <p className="text-xs text-black/90 font-bold">
            5 ta do‘stingizni taklif qiling va bosh sovrin ishtirokchisiga aylaning!
          </p>
        </div>

        {/* User Progress */}
        <div className="p-3.5 rounded-2xl bg-black/20 backdrop-blur-md border border-black/20 space-y-2 text-white">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Sizning natijangiz:</span>
            <span className="text-amber-200 font-black">{referralCount} / 5 ta do‘st</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden">
            <div
              style={{ width: `${refPercent}%` }}
              className="h-full bg-gradient-to-r from-amber-300 to-yellow-200 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsReferralModalOpen(true);
          }}
          className="w-full py-3 rounded-2xl bg-[#0B0E14] hover:bg-[#161D2B] text-amber-400 font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border border-amber-500/40"
        >
          <Share2 className="w-4 h-4" />
          <span>Do‘stlarni Taklif Qilish (+50 Coin)</span>
        </button>
      </div>

      {/* 2. Real Book Quizzes Section (Kitoblardan Testlar) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-sm text-white">Kitoblar Bo‘yicha Testlar</h3>
          </div>
          <span className="text-[10px] text-amber-400 font-bold">+250 Coin gacha</span>
        </div>

        <div className="space-y-2.5">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="p-3.5 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-sm flex items-center justify-between gap-3 hover:border-amber-500/40 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <h4 className="font-extrabold text-xs text-white truncate">{quiz.title}</h4>
                <p className="text-[10px] text-slate-400 line-clamp-1">{quiz.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold pt-0.5">
                  <span>🪙 +{quiz.reward_coins} Coin</span>
                  <span>•</span>
                  <span>{quiz.questions_count} ta savol</span>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setSelectedQuiz(quiz);
                }}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs shrink-0 shadow-md active:scale-95 transition-transform"
              >
                Boshlash
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Top Leaderboard */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="font-extrabold text-sm text-white">Akademiya Peshqadamlari Reytingi</h3>
        </div>

        {/* Podium Top 3 */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 pt-2 pb-1 text-center items-end">
            {/* 2nd Place */}
            <div className="p-3 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xs space-y-1">
              <div className="text-xl">🥈</div>
              <div className="w-10 h-10 rounded-full bg-[#1C2538] border-2 border-slate-400 mx-auto flex items-center justify-center font-black text-xs text-slate-200">
                {leaderboard[1]?.full_name?.[0] || '2'}
              </div>
              <div className="font-bold text-[11px] text-white truncate">
                {leaderboard[1]?.full_name}
              </div>
              <div className="text-[10px] font-black text-amber-400">
                🪙 {leaderboard[1]?.coin_balance?.toLocaleString()}
              </div>
            </div>

            {/* 1st Place */}
            <div className="p-3.5 rounded-3xl bg-gradient-to-b from-[#1C2538] to-[#141B29] border-2 border-amber-500 shadow-xl space-y-1 -translate-y-2 glow-gold">
              <div className="text-2xl">👑</div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-white mx-auto flex items-center justify-center font-black text-sm text-slate-900 shadow-xs">
                {leaderboard[0]?.full_name?.[0] || '1'}
              </div>
              <div className="font-black text-xs text-white truncate">
                {leaderboard[0]?.full_name}
              </div>
              <div className="text-[11px] font-black text-amber-400">
                🪙 {leaderboard[0]?.coin_balance?.toLocaleString()}
              </div>
            </div>

            {/* 3rd Place */}
            <div className="p-3 rounded-3xl bg-[#141B29] border border-[#232F47] shadow-xs space-y-1">
              <div className="text-xl">🥉</div>
              <div className="w-10 h-10 rounded-full bg-[#1C2538] border-2 border-amber-700/60 mx-auto flex items-center justify-center font-black text-xs text-slate-200">
                {leaderboard[2]?.full_name?.[0] || '3'}
              </div>
              <div className="font-bold text-[11px] text-white truncate">
                {leaderboard[2]?.full_name}
              </div>
              <div className="text-[10px] font-black text-amber-400">
                🪙 {leaderboard[2]?.coin_balance?.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Remaining List */}
        <div className="bg-[#141B29] rounded-3xl border border-[#232F47] shadow-xs divide-y divide-[#1E293B] overflow-hidden">
          {leaderboard.slice(3).map((u, i) => (
            <div key={u.id} className="p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-black text-slate-500">{i + 4}</span>
                <div>
                  <div className="font-bold text-white">{u.full_name}</div>
                  <div className="text-[10px] text-slate-400">
                    {u.books_read_count || 0} kitob • {u.streak_days || 1} kun seriya
                  </div>
                </div>
              </div>
              <div className="font-extrabold text-amber-400 text-xs">
                🪙 {u.coin_balance?.toLocaleString()} Coin
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Modal */}
      {isReferralModalOpen && <ReferralModal onClose={() => setIsReferralModalOpen(false)} />}

      {/* Quiz Modal */}
      {selectedQuiz && (
        <QuizModal quizId={selectedQuiz.id} onClose={() => setSelectedQuiz(null)} />
      )}
    </div>
  );
};
