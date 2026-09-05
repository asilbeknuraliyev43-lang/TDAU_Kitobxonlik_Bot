import React, { useState, useEffect } from 'react';
import { Quiz, QuizQuestion } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import { X, Clock, CheckCircle2, AlertCircle, Trophy, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import confetti from 'canvas-confetti';

interface QuizModalProps {
  quizId: number;
  onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ quizId, onClose }) => {
  const { updateCoinBalance, refreshUserData, showToast } = useApp();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ questionId: number; selectedOption: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(40);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const res = await api.getQuizDetail(quizId);
      setQuiz(res.quiz);
      setQuestions(res.questions);
      setTimeLeft(res.questions[0]?.timeLimitSeconds || 40);
    } catch (err: any) {
      showToast(err.message || 'Testni yuklashda xatolik', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // 40s countdown timer
  useEffect(() => {
    if (result || loading || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleOptionSelect(-1); // timeout
          return 40;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQIndex, result, loading, questions]);

  const handleOptionSelect = (optionIdx: number) => {
    triggerHaptic('light');
    const currentQ = questions[currentQIndex];
    const newAnswers = [...userAnswers, { questionId: currentQ.id, selectedOption: optionIdx }];
    setUserAnswers(newAnswers);

    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex((prev) => prev + 1);
      setTimeLeft(questions[currentQIndex + 1]?.timeLimitSeconds || 40);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const finishQuiz = async (answers: any[]) => {
    try {
      setSubmitting(true);
      const res = await api.submitQuiz(quizId, answers);
      setResult(res);

      if (res.passed) {
        triggerHaptic('success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        triggerHaptic('warning');
      }

      await refreshUserData();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !quiz) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md text-slate-800">
        <div className="p-4 rounded-2xl bg-white text-xs font-bold shadow-xl">
          Test savollari tayyorlanmoqda...
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in text-slate-800">
      {/* Header */}
      <header className="px-4 py-3 border-b border-blue-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        {!result && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
        )}

        <span className="text-xs font-bold text-slate-500">
          {!result ? `Savol ${currentQIndex + 1}/${questions.length}` : 'Natija'}
        </span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-5 max-w-md mx-auto w-full flex flex-col justify-between">
        {!result && currentQ ? (
          <div className="space-y-5 my-auto">
            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
              />
            </div>

            {/* Question Text */}
            <div className="p-5 rounded-3xl bg-blue-50/50 border border-blue-100 text-center shadow-xs">
              <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                {currentQ.questionText}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className="w-full p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-800 text-xs font-bold text-left transition-all active:scale-98 shadow-xs flex items-center justify-between"
                >
                  <span>{opt}</span>
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center">
                    {String.fromCharCode(65 + idx)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : result ? (
          /* Result Screen */
          <div className="my-auto text-center space-y-4 animate-scale-up">
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl ${
                result.passed
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/25'
                  : 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/25'
              }`}
            >
              {result.passed ? '🏆' : '📚'}
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-xl text-slate-900">
                {result.passed ? 'Tabriklaymiz!' : 'Yana urinib ko‘ring!'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{result.message}</p>
            </div>

            <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xl font-black text-blue-600">{result.scorePercent}%</div>
                <div className="text-[10px] text-slate-400 font-bold">To‘g‘ri javoblar</div>
              </div>
              <div>
                <div className="text-xl font-black text-amber-500">+{result.coinsEarned}</div>
                <div className="text-[10px] text-slate-400 font-bold">Yutilgan Coin</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
            >
              Yakunlash
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
};
