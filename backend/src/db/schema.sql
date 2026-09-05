-- ==========================================================
-- KITOBXON DATABASE SCHEMA (SQLITE)
-- ==========================================================

-- 1. Foydalanuvchilar (Users)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT UNIQUE NOT NULL,
  username TEXT,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  avatar_url TEXT,
  coin_balance INTEGER DEFAULT 50,
  is_premium INTEGER DEFAULT 0,
  premium_until DATETIME,
  referred_by TEXT,
  streak_days INTEGER DEFAULT 1,
  last_daily_bonus_at DATETIME,
  last_lucky_spin_at DATETIME,
  is_profile_completed INTEGER DEFAULT 0,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Kitoblar (Books)
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT,
  description TEXT,
  category TEXT DEFAULT 'Badiiy',
  price INTEGER DEFAULT 0,
  pdf_url TEXT,
  pages_count INTEGER DEFAULT 100,
  preview_pages INTEGER DEFAULT 10,
  unlock_price_coins INTEGER DEFAULT 50,
  rating_avg REAL DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  sample_content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Foydalanuvchi tomonidan ochilgan kitoblar (User Book Unlocks / Paywall)
CREATE TABLE IF NOT EXISTS user_book_unlocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  coins_paid INTEGER DEFAULT 50,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  UNIQUE(user_id, book_id)
);

-- 4. Sevimlilar (User Favorites)
CREATE TABLE IF NOT EXISTS user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  UNIQUE(user_id, book_id)
);

-- 5. Mutolaa seanslari (Reading Sessions)
CREATE TABLE IF NOT EXISTS reading_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NOT NULL,
  pages_read INTEGER DEFAULT 1,
  duration_seconds INTEGER DEFAULT 60,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 6. Viktorina va Testlar (Quizzes)
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  questions_count INTEGER DEFAULT 5,
  pass_threshold_percent INTEGER DEFAULT 70,
  reward_coins INTEGER DEFAULT 100,
  reward_premium_days INTEGER DEFAULT 0,
  entry_cost_coins INTEGER DEFAULT 0,
  min_pages_required INTEGER DEFAULT 20,
  time_per_question_seconds INTEGER DEFAULT 40,
  type TEXT DEFAULT 'cup',
  starts_at DATETIME,
  ends_at DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

-- 7. Test savollari (Quiz Questions)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_option INTEGER NOT NULL,
  time_limit_seconds INTEGER DEFAULT 40,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- 8. Test topshirish urinishlari (Quiz Attempts)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quiz_id INTEGER NOT NULL,
  score_percent INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- 9. Kitob sharhlari (Reviews)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  rating INTEGER DEFAULT 5,
  comment_text TEXT NOT NULL,
  is_quality_approved INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 10. Market Mahsulotlari (Market Items)
CREATE TABLE IF NOT EXISTS market_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_coins INTEGER NOT NULL,
  stock INTEGER DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Buyurtmalar (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  market_item_id INTEGER NOT NULL,
  status TEXT DEFAULT 'kutilmoqda',
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (market_item_id) REFERENCES market_items(id) ON DELETE CASCADE
);

-- 12. Sertifikatlar (Certificates)
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  achievement TEXT NOT NULL,
  certificate_code TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Tanga va Coin hisob-kitoblari (Transactions)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Taklif qilingan do'stlar (Referrals)
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. Tanlovlar (Contests)
CREATE TABLE IF NOT EXISTS contests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  banner_url TEXT,
  prize_description TEXT NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  condition_type TEXT DEFAULT 'referrals',
  condition_target INTEGER DEFAULT 5,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. Bannerlar (Banners)
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  action_url TEXT,
  badge TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
