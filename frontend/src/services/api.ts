import { getInitData } from './telegram.js';
import {
  User,
  UserStats,
  Book,
  Review,
  Quiz,
  QuizQuestion,
  MarketItem,
  Order,
  Certificate,
  Transaction,
  Contest,
  Banner,
  NotificationItem,
} from '../types/index.js';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (initData) {
    headers.set('x-telegram-init-data', initData);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Server xatosi yuz berdi');
  }
  return data as T;
}

export const api = {
  // User & Profile
  getMe: () => request<{ user: User; stats: UserStats }>('/user/me'),
  updateProfile: (fullName: string, phoneNumber?: string) =>
    request<{ success: boolean; user: User; message: string }>('/user/profile', {
      method: 'POST',
      body: JSON.stringify({ fullName, phoneNumber }),
    }),
  claimDailyBonus: () =>
    request<{ success: boolean; bonusAmount: number; newBalance: number; message: string }>(
      '/user/daily-bonus',
      { method: 'POST' }
    ),
  luckySpin: () =>
    request<{ success: boolean; wonCoins: number; newBalance: number; message: string }>(
      '/user/lucky-spin',
      { method: 'POST' }
    ),
  getTransactions: () => request<{ transactions: Transaction[] }>('/user/transactions'),
  getReferrals: () => request<{ referrals: any[]; count: number; referralLink: string }>('/user/referrals'),
  upgradePremium: (planMonths: number) =>
    request<{ success: boolean; user: User }>('/user/upgrade-premium', {
      method: 'POST',
      body: JSON.stringify({ planMonths }),
    }),
  checkChannels: () =>
    request<{ isSubscribed: boolean; missingChannels: Array<{ name: string; username: string; url: string }> }>(
      '/user/check-channels',
      { method: 'POST' }
    ),

  // Books
  getBooks: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    return request<{ books: Book[] }>(`/books?${params.toString()}`);
  },
  getBookDetail: (id: number | string) =>
    request<{ book: Book; reviews: Review[] }>(`/books/${id}`),
  unlockBook: (id: number | string) =>
    request<{ success: boolean; is_unlocked: number; newBalance: number; message: string }>(
      `/books/${id}/unlock`,
      { method: 'POST' }
    ),
  toggleFavorite: (id: number | string) =>
    request<{ is_favorite: number }>(`/books/${id}/favorite`, { method: 'POST' }),
  recordReadingSession: (id: number | string, pagesRead: number, durationSeconds: number) =>
    request<{ success: boolean; totalPagesRead: number }>(`/books/${id}/reading-session`, {
      method: 'POST',
      body: JSON.stringify({ pagesRead, durationSeconds }),
    }),
  submitReview: (id: number | string, rating: number, commentText: string) =>
    request<{ success: boolean; coinsEarned: number; isApproved: boolean; message: string }>(
      `/books/${id}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify({ rating, commentText }),
      }
    ),
  orderPhysicalBook: (id: number | string, data: { phone: string; address: string; notes?: string }) =>
    request<{ success: boolean; message: string }>(`/books/${id}/order-physical`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Quizzes & Cup
  getQuizzes: () => request<{ quizzes: Quiz[] }>('/quizzes'),
  getQuizDetail: (id: number | string) =>
    request<{ quiz: Quiz; questions: QuizQuestion[] }>(`/quizzes/${id}`),
  submitQuiz: (id: number | string, userAnswers: { questionId: number; selectedOption: number }[]) =>
    request<{
      passed: boolean;
      scorePercent: number;
      correctCount: number;
      totalQuestions: number;
      coinsEarned: number;
      isFirstPass: boolean;
      message: string;
    }>(`/quizzes/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ userAnswers }),
    }),

  // Contests
  getContests: () => request<{ contests: Contest[] }>('/contests'),
  getLeaderboard: () => request<{ leaderboard: any[] }>('/contests/leaderboard'),

  // Market
  getMarketItems: (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    return request<{ items: MarketItem[] }>(`/market/items?${params.toString()}`);
  },
  buyMarketItem: (data: { itemId: number; phone?: string; address?: string; notes?: string }) =>
    request<{ success: boolean; message: string; coinBalance: number }>('/market/buy', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyOrders: () => request<{ orders: Order[] }>('/market/my-orders'),

  // Certificates
  getMyCertificates: () => request<{ certificates: Certificate[] }>('/certificates/my'),
  generateCertificate: (title: string, achievement: string) =>
    request<{ success: boolean; certificate: Certificate }>('/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({ title, achievement }),
    }),

  // Banners & Notifications
  getBanners: () => request<{ banners: Banner[] }>('/banners'),
  getNotifications: () => request<{ notifications: NotificationItem[] }>('/notifications'),

  // Admin
  getAdminStats: () =>
    request<{
      usersCount: number;
      booksCount: number;
      quizzesCount: number;
      ordersCount: number;
      pendingReviewsCount: number;
    }>('/admin/stats'),
  createAdminBook: (bookData: any) =>
    request<{ success: boolean; book: Book }>('/admin/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    }),
  deleteAdminBook: (id: number) =>
    request<{ success: boolean }>(`/admin/books/${id}`, { method: 'DELETE' }),
  createAdminQuiz: (quizData: any) =>
    request<{ success: boolean }>('/admin/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData),
    }),
  getAdminReviews: () => request<{ reviews: Review[] }>('/admin/reviews'),
  moderateAdminReview: (id: number, approve: boolean) =>
    request<{ success: boolean }>(`/admin/reviews/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ approve }),
    }),
  getAdminOrders: () => request<{ orders: Order[] }>('/admin/orders'),
  updateAdminOrderStatus: (id: number, status: string) =>
    request<{ success: boolean }>(`/admin/orders/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
};
