export interface UserLevelInfo {
  levelName: string;
  levelIcon: string;
  nextLevelName: string;
  targetCoins: number;
  coinsLeft: number;
  percent: number;
  progressBar: string;
}

export interface User {
  id: number;
  telegram_id: string;
  username?: string;
  full_name: string;
  phone_number?: string;
  avatar_url?: string;
  coin_balance: number;
  is_premium: number;
  premium_until?: string;
  referred_by?: string;
  streak_days: number;
  last_daily_bonus_at?: string;
  last_lucky_spin_at?: string;
  is_profile_completed?: number;
  last_active_at?: string;
  created_at: string;
  isAdmin?: boolean;
  referralLink?: string;
  levelInfo?: UserLevelInfo;
  canClaimDailyBonus?: boolean;
  hoursUntilNextBonus?: number;
  canLuckySpin?: boolean;
  hoursUntilNextSpin?: number;
  isChannelSubscribed?: boolean;
  missingChannels?: Array<{ name: string; username: string; url: string }>;
}

export interface Badge {
  id: number;
  name: string;
  icon: string;
  unlocked: boolean;
}

export interface UserStats {
  booksCount: number;
  readingHours: number;
  readingMinutes: number;
  streakDays: number;
  completedQuizzes: number;
  certificatesCount: number;
  referralCount: number;
  badges: Badge[];
}

export interface Book {
  id: number;
  title: string;
  author: string;
  cover_url?: string;
  description: string;
  category: string;
  price: number;
  pdf_url?: string;
  pages_count: number;
  preview_pages?: number;
  unlock_price_coins?: number;
  rating_avg: number;
  reviews_count: number;
  sample_content?: string;
  created_at: string;
  is_favorite?: number;
  is_unlocked?: number;
  user_pages_read?: number;
  user_duration_seconds?: number;
}

export interface Review {
  id: number;
  user_id: number;
  book_id: number;
  rating: number;
  comment_text: string;
  is_quality_approved: number;
  coins_earned: number;
  created_at: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  book_title?: string;
}

export interface QuizQuestion {
  id: number;
  questionText: string;
  options: string[];
  timeLimitSeconds: number;
}

export interface Quiz {
  id: number;
  book_id?: number;
  title: string;
  description?: string;
  questions_count: number;
  pass_threshold_percent: number;
  reward_coins: number;
  reward_premium_days: number;
  entry_cost_coins: number;
  min_pages_required: number;
  time_per_question_seconds: number;
  type: string;
  starts_at?: string;
  ends_at?: string;
  is_active: number;
  book_title?: string;
  book_cover?: string;
  book_author?: string;
  user_pages_read?: number;
  is_completed?: number;
  participants_count?: number;
  isUnlocked?: boolean;
  pagesRemaining?: number;
}

export interface MarketItem {
  id: number;
  category: string;
  title: string;
  description?: string;
  image_url?: string;
  price_coins: number;
  stock: number;
  is_active: number;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: number;
  market_item_id: number;
  status: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  item_title?: string;
  item_image?: string;
  price_coins?: number;
  full_name?: string;
  username?: string;
  telegram_id?: string;
}

export interface Certificate {
  id: number;
  user_id: number;
  title: string;
  achievement: string;
  certificate_code: string;
  pdf_url?: string;
  issued_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'kirim' | 'chiqim';
  amount: number;
  reason: string;
  created_at: string;
}

export interface Contest {
  id: number;
  title: string;
  banner_url?: string;
  prize_description: string;
  starts_at: string;
  ends_at: string;
  condition_type: string;
  condition_target: number;
  is_active: number;
  created_at: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  action_url?: string;
  badge?: string;
  is_active: number;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}
