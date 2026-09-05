import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserStats, Book, Quiz } from '../types/index.js';
import { api } from '../services/api.js';
import { initTelegramApp, triggerHaptic } from '../services/telegram.js';

export type TabType = 'home' | 'contest' | 'cup' | 'market' | 'library' | 'profile' | 'admin';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  user: User | null;
  stats: UserStats | null;
  coinBalance: number;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeBook: Book | null;
  setActiveBook: (book: Book | null) => void;
  isReaderOpen: boolean;
  setIsReaderOpen: (open: boolean) => void;
  activeQuiz: Quiz | null;
  setActiveQuiz: (quiz: Quiz | null) => void;
  isQuizOpen: boolean;
  setIsQuizOpen: (open: boolean) => void;
  isPremiumModalOpen: boolean;
  setIsPremiumModalOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isCertModalOpen: boolean;
  setIsCertModalOpen: (open: boolean) => void;
  isReferralModalOpen: boolean;
  setIsReferralModalOpen: (open: boolean) => void;
  toast: ToastState;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  refreshUserData: () => Promise<void>;
  updateCoinBalance: (newBalance: number) => void;
  openReader: (book: Book) => void;
  openReaderForBook: (book: Book) => void;
  openQuizForBook: (quiz: Quiz) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [coinBalance, setCoinBalance] = useState<number>(50);
  const [activeTab, setActiveTabState] = useState<TabType>('home');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info',
  });

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setToast({ show: true, message, type });
    triggerHaptic(type === 'error' ? 'error' : 'light');
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  const setActiveTab = (tab: TabType) => {
    triggerHaptic('light');
    setActiveTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshUserData = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setStats(data.stats);
      setCoinBalance(data.user.coin_balance);
    } catch (err: any) {
      console.warn('Could not fetch user profile:', err.message);
    }
  };

  const updateCoinBalance = (newBalance: number) => {
    setCoinBalance(newBalance);
    if (user) {
      setUser({ ...user, coin_balance: newBalance });
    }
  };

  const openReaderForBook = (book: Book) => {
    setActiveBook(book);
    setIsReaderOpen(true);
    triggerHaptic('medium');
  };

  const openQuizForBook = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setIsQuizOpen(true);
    triggerHaptic('medium');
  };

  useEffect(() => {
    initTelegramApp();
    refreshUserData();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        stats,
        coinBalance,
        activeTab,
        setActiveTab,
        activeBook,
        setActiveBook,
        isReaderOpen,
        setIsReaderOpen,
        activeQuiz,
        setActiveQuiz,
        isQuizOpen,
        setIsQuizOpen,
        isPremiumModalOpen,
        setIsPremiumModalOpen,
        isNotificationOpen: isNotificationsOpen,
        setIsNotificationOpen: setIsNotificationsOpen,
        isNotificationsOpen,
        setIsNotificationsOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        isCertModalOpen,
        setIsCertModalOpen,
        isReferralModalOpen,
        setIsReferralModalOpen,
        toast,
        showToast,
        refreshUserData,
        updateCoinBalance,
        openReader: openReaderForBook,
        openReaderForBook,
        openQuizForBook,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
