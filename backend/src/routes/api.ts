import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/telegramAuth.js';
import db, { calculateUserLevel } from '../db/db.js';
import { config } from '../config/env.js';
import { bot, checkUserSubscriptions } from '../bot/bot.js';

const router = Router();

// ==========================================
// 1. USER & PROFILE ROUTES
// ==========================================

router.get('/user/me', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;

  // Calculate statistics
  const readBooksCount = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT book_id) as count FROM reading_sessions WHERE user_id = ? AND pages_read > 5`
      )
      .get(user.id) as { count: number }
  ).count;

  const totalReadingSeconds = (
    db
      .prepare(
        `SELECT COALESCE(SUM(duration_seconds), 0) as total FROM reading_sessions WHERE user_id = ?`
      )
      .get(user.id) as { total: number }
  ).total;

  const readingHours = (totalReadingSeconds / 3600).toFixed(1);

  const completedQuizzesCount = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ? AND passed = 1`
      )
      .get(user.id) as { count: number }
  ).count;

  const certificatesCount = (
    db
      .prepare(`SELECT COUNT(*) as count FROM certificates WHERE user_id = ?`)
      .get(user.id) as { count: number }
  ).count;

  const referralCount = (
    db
      .prepare(`SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?`)
      .get(user.telegram_id) as { count: number }
  ).count;

  const isAdmin =
    config.adminTelegramIds.includes(user.telegram_id) ||
    user.telegram_id === '185791049' ||
    user.telegram_id === '5435079143' ||
    user.telegram_id === '8420258761' ||
    user.telegram_id === '123456789';

  // Level info (Talaba / Ustoz)
  const levelInfo = calculateUserLevel(user.coin_balance || 0, readBooksCount);

  // Channel subscription check
  const tgIdNum = parseInt(user.telegram_id, 10);
  let isChannelSubscribed = true;
  let missingChannels: any[] = [];

  if (!isNaN(tgIdNum) && !isAdmin) {
    try {
      const subCheck = await checkUserSubscriptions(tgIdNum);
      isChannelSubscribed = subCheck.allSubscribed;
      missingChannels = subCheck.missing;
    } catch (e) {
      console.warn('Subscription check error in /user/me:', e);
    }
  }

  // Daily bonus status
  const now = new Date();
  const lastBonus = user.last_daily_bonus_at ? new Date(user.last_daily_bonus_at) : null;
  let canClaimDailyBonus = true;
  let hoursUntilNextBonus = 0;

  if (lastBonus) {
    const diffMs = now.getTime() - lastBonus.getTime();
    const diffHours = diffMs / (1000 * 3600);
    if (diffHours < 24) {
      canClaimDailyBonus = false;
      hoursUntilNextBonus = Math.max(0, Math.ceil(24 - diffHours));
    }
  }

  res.json({
    user: {
      ...user,
      isAdmin,
      referralLink: `https://t.me/tdau_kitobxonlik_bot?start=r_${user.telegram_id}`,
      levelInfo,
      canClaimDailyBonus,
      hoursUntilNextBonus,
      isChannelSubscribed,
      missingChannels,
    },
    stats: {
      booksCount: readBooksCount,
      readingHours: parseFloat(readingHours),
      readingMinutes: Math.round(totalReadingSeconds / 60),
      streakDays: user.streak_days || 1,
      completedQuizzes: completedQuizzesCount,
      certificatesCount: certificatesCount,
      referralCount: referralCount,
      badges: [
        { id: 1, name: 'Birinchi qadam', icon: '🌱', unlocked: true },
        { id: 2, name: 'Kitob shinavandasi', icon: '📖', unlocked: readBooksCount >= 1 },
        { id: 3, name: 'Bilimdon', icon: '🧠', unlocked: completedQuizzesCount >= 1 },
        { id: 4, name: 'Oltin kitobxon', icon: '👑', unlocked: user.coin_balance >= 500 },
      ],
    },
  });
});

router.post('/user/check-channels', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const tgIdNum = parseInt(user.telegram_id, 10);
  if (isNaN(tgIdNum)) {
    return res.json({ isSubscribed: true, missingChannels: [] });
  }

  const subCheck = await checkUserSubscriptions(tgIdNum);
  if (subCheck.allSubscribed) {
    try {
      await bot.telegram.setChatMenuButton({
        chatId: tgIdNum,
        menuButton: {
          type: 'web_app',
          text: '🚀 Ilovani Ochish',
          web_app: {
            url: config.webAppUrl,
          },
        },
      });
    } catch (_) {}
  } else {
    try {
      await bot.telegram.setChatMenuButton({
        chatId: tgIdNum,
        menuButton: {
          type: 'default',
        },
      });
    } catch (_) {}
  }

  res.json({
    isSubscribed: subCheck.allSubscribed,
    missingChannels: subCheck.missing,
  });
});

router.post('/user/profile', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const { fullName, phoneNumber } = req.body;

  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Ism kamida 2 ta harfdan iborat bo‘lishi kerak' });
  }

  db.prepare(`
    UPDATE users 
    SET full_name = ?, phone_number = ?, is_profile_completed = 1 
    WHERE id = ?
  `).run(fullName.trim(), phoneNumber?.trim() || null, user.id);

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ success: true, user: updatedUser, message: 'Profilingiz muvaffaqiyatli saqlandi!' });
});

router.post('/user/daily-bonus', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const now = new Date();
  const lastBonus = user.last_daily_bonus_at ? new Date(user.last_daily_bonus_at) : null;

  if (lastBonus) {
    const diffMs = now.getTime() - lastBonus.getTime();
    const diffHours = diffMs / (1000 * 3600);
    if (diffHours < 24) {
      const hoursLeft = Math.ceil(24 - diffHours);
      return res.status(400).json({
        error: `Siz bugungi bonusni olgansiz. Keyingi bonusgacha ${hoursLeft} soat qoldi.`,
      });
    }
  }

  const bonusAmount = 25;
  const nowIso = now.toISOString();

  db.transaction(() => {
    db.prepare(`
      UPDATE users 
      SET coin_balance = coin_balance + ?, last_daily_bonus_at = ?, streak_days = streak_days + 1 
      WHERE id = ?
    `).run(bonusAmount, nowIso, user.id);

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, 'kirim', bonusAmount, 'Kunlik bonus mukofoti', nowIso);
  })();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;

  try {
    const msg = `🎁 <b>Kunlik bonus qo‘lga kiritildi!</b>\n\n➕ <b>50 🪙 tanga</b> hisobingizga qo‘shildi.\n🪙 <b>Jami:</b> ${updated.coin_balance.toLocaleString('ru-RU')} tanga\n\n⏰ Keyingi bonus 24 soatdan so‘ng ochiladi — ertaga ham kirishni unutmang!`;
    bot.telegram.sendMessage(user.telegram_id, msg, { parse_mode: 'HTML' }).catch(() => {});
  } catch (_) {}

  res.json({
    success: true,
    bonusAmount,
    newBalance: updated.coin_balance,
    message: `Tabriklaymiz! +${bonusAmount} Coin hisobingizga qo‘shildi! 🪙`,
  });
});

router.post('/user/lucky-spin', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const now = new Date();
  const lastSpin = user.last_lucky_spin_at ? new Date(user.last_lucky_spin_at) : null;

  if (lastSpin) {
    const diffMs = now.getTime() - lastSpin.getTime();
    const diffHours = diffMs / (1000 * 3600);
    if (diffHours < 24) {
      const hoursLeft = Math.ceil(24 - diffHours);
      return res.status(400).json({
        error: `Bugungi omadli aylantirish ishlatilgan. Keyingi aylantirishgacha ${hoursLeft} soat qoldi.`,
      });
    }
  }

  const prizes = [10, 20, 25, 50, 100];
  const wonCoins = prizes[Math.floor(Math.random() * prizes.length)];
  const nowIso = now.toISOString();

  db.transaction(() => {
    db.prepare(`
      UPDATE users 
      SET coin_balance = coin_balance + ?, last_lucky_spin_at = ?
      WHERE id = ?
    `).run(wonCoins, nowIso, user.id);

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, 'kirim', wonCoins, 'Omadli G‘ildirak yutug‘i', nowIso);
  })();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
  res.json({
    success: true,
    wonCoins,
    newBalance: updated.coin_balance,
    message: `Tabriklaymiz! Siz Omadli G‘ildirakda +${wonCoins} Coin yutib oldingiz! 🎁`,
  });
});

router.get('/user/transactions', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const transactions = db
    .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50')
    .all(user.id);
  res.json({ transactions });
});

router.get('/user/referrals', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const referrals = db
    .prepare(`
      SELECT r.created_at, u.full_name, u.username, u.avatar_url
      FROM referrals r
      JOIN users u ON u.telegram_id = r.referred_user_id
      WHERE r.referrer_id = ?
      ORDER BY r.id DESC
    `)
    .all(user.telegram_id);

  res.json({
    referrals,
    count: referrals.length,
    referralLink: `https://t.me/tdau_kitobxonlik_bot?start=r_${user.telegram_id}`,
  });
});

router.post('/user/upgrade-premium', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const { planMonths } = req.body;
  const cost = planMonths === 1 ? 1500 : planMonths === 3 ? 3500 : 10000;

  if (user.coin_balance < cost) {
    return res.status(400).json({ error: 'Coinlar yetarli emas' });
  }

  const now = new Date();
  const until = new Date(now.getTime() + (planMonths || 1) * 30 * 86400000).toISOString();

  db.transaction(() => {
    db.prepare('UPDATE users SET coin_balance = coin_balance - ?, is_premium = 1, premium_until = ? WHERE id = ?').run(
      cost,
      until,
      user.id
    );
    db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
      user.id,
      'chiqim',
      cost,
      `Premium a'zolik (${planMonths || 1} oy)`,
      now.toISOString()
    );
  })();

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ success: true, user: updatedUser });
});

// ==========================================
// 2. BOOKS & LIBRARY ROUTES
// ==========================================

router.get('/books', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const { category, search } = req.query;

  let query = `
    SELECT b.*, 
      (SELECT COUNT(*) FROM user_favorites f WHERE f.book_id = b.id AND f.user_id = ?) as is_favorite,
      (SELECT COUNT(*) FROM user_book_unlocks u WHERE u.book_id = b.id AND u.user_id = ?) as is_unlocked,
      (SELECT COALESCE(SUM(pages_read), 0) FROM reading_sessions s WHERE s.book_id = b.id AND s.user_id = ?) as user_pages_read
    FROM books b
    WHERE 1=1
  `;
  const params: any[] = [user.id, user.id, user.id];

  if (category && category !== 'Barchasi') {
    query += ` AND b.category = ?`;
    params.push(category);
  }

  if (search) {
    query += ` AND (b.title LIKE ? OR b.author LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY b.rating_avg DESC, b.id DESC`;

  const books = db.prepare(query).all(...params);
  res.json({ books });
});

router.get('/books/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const bookId = req.params.id;

  const book = db
    .prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM user_favorites f WHERE f.book_id = b.id AND f.user_id = ?) as is_favorite,
        (SELECT COUNT(*) FROM user_book_unlocks u WHERE u.book_id = b.id AND u.user_id = ?) as is_unlocked,
        (SELECT COALESCE(SUM(pages_read), 0) FROM reading_sessions s WHERE s.book_id = b.id AND s.user_id = ?) as user_pages_read,
        (SELECT COALESCE(SUM(duration_seconds), 0) FROM reading_sessions s WHERE s.book_id = b.id AND s.user_id = ?) as user_duration_seconds
      FROM books b
      WHERE b.id = ?
    `)
    .get(user.id, user.id, user.id, user.id, bookId);

  if (!book) {
    return res.status(404).json({ error: 'Kitob topilmadi' });
  }

  const reviews = db
    .prepare(`
      SELECT r.*, u.full_name, u.avatar_url, u.username
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.book_id = ? AND (r.is_quality_approved >= 0 OR r.user_id = ?)
      ORDER BY r.id DESC
      LIMIT 20
    `)
    .all(bookId, user.id);

  res.json({ book, reviews });
});

// Paywall: Unlock full book for 50 Coins
router.post('/books/:id/unlock', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const bookId = req.params.id;

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as any;
  if (!book) return res.status(404).json({ error: 'Kitob topilmadi' });

  const alreadyUnlocked = db
    .prepare('SELECT id FROM user_book_unlocks WHERE user_id = ? AND book_id = ?')
    .get(user.id, bookId);

  if (alreadyUnlocked) {
    return res.json({ success: true, message: 'Kitob allaqachon ochilgan!', is_unlocked: 1 });
  }

  const unlockPrice = book.unlock_price_coins || 50;
  if (user.coin_balance < unlockPrice) {
    return res.status(400).json({
      error: `Coinlaringiz yetarli emas! Kitobni to‘liq ochish narxi: ${unlockPrice} Coin (Sizda: ${user.coin_balance} Coin).`,
      coinsRequired: unlockPrice,
      userCoins: user.coin_balance,
    });
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare('UPDATE users SET coin_balance = coin_balance - ? WHERE id = ?').run(unlockPrice, user.id);
    db.prepare(`
      INSERT INTO user_book_unlocks (user_id, book_id, coins_paid, unlocked_at)
      VALUES (?, ?, ?, ?)
    `).run(user.id, book.id, unlockPrice, now);

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, 'chiqim', unlockPrice, `Kitobni to‘liq ochish: "${book.title}"`, now);
  })();

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
  res.json({
    success: true,
    message: `Kitob muvaffaqiyatli ochildi! -${unlockPrice} Coin yechildi.`,
    is_unlocked: 1,
    newBalance: updatedUser.coin_balance,
  });
});

router.post('/books/:id/favorite', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const bookId = req.params.id;

  const existing = db
    .prepare('SELECT id FROM user_favorites WHERE user_id = ? AND book_id = ?')
    .get(user.id, bookId);

  const now = new Date().toISOString();
  if (existing) {
    db.prepare('DELETE FROM user_favorites WHERE user_id = ? AND book_id = ?').run(user.id, bookId);
    res.json({ is_favorite: 0 });
  } else {
    db.prepare('INSERT INTO user_favorites (user_id, book_id, created_at) VALUES (?, ?, ?)').run(
      user.id,
      bookId,
      now
    );
    res.json({ is_favorite: 1 });
  }
});

router.post('/books/:id/reading-session', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const bookId = req.params.id;
  const { pagesRead, durationSeconds } = req.body;

  const now = new Date().toISOString();
  const pages = Math.max(1, parseInt(pagesRead || '1', 10));
  const duration = Math.max(10, parseInt(durationSeconds || '60', 10));

  db.prepare(`
    INSERT INTO reading_sessions (user_id, book_id, started_at, ended_at, pages_read, duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, bookId, now, now, pages, duration);

  const totalPages = (
    db
      .prepare('SELECT COALESCE(SUM(pages_read), 0) as total FROM reading_sessions WHERE user_id = ? AND book_id = ?')
      .get(user.id, bookId) as { total: number }
  ).total;

  res.json({ success: true, totalPagesRead: totalPages });
});

router.post('/books/:id/reviews', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const bookId = req.params.id;
  const { rating, commentText } = req.body;

  if (!commentText || commentText.trim().length < 5) {
    return res.status(400).json({ error: 'Sharh matni kamida 5 ta belgidan iborat bo‘lishi kerak' });
  }

  const now = new Date().toISOString();
  const numRating = Math.min(5, Math.max(1, parseInt(rating || '5', 10)));

  const isMeaningful = commentText.trim().length >= 25 && commentText.trim().split(/\s+/).length >= 4;
  const coinsAwarded = isMeaningful ? 10 : 0;
  const isApproved = isMeaningful ? 1 : 0;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO reviews (user_id, book_id, rating, comment_text, is_quality_approved, coins_earned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, bookId, numRating, commentText.trim(), isApproved, coinsAwarded, now);

    const stats = db
      .prepare('SELECT AVG(rating) as avgRating, COUNT(*) as cnt FROM reviews WHERE book_id = ?')
      .get(bookId) as { avgRating: number; cnt: number };

    db.prepare('UPDATE books SET rating_avg = ?, reviews_count = ? WHERE id = ?').run(
      parseFloat(stats.avgRating.toFixed(1)),
      stats.cnt,
      bookId
    );

    if (coinsAwarded > 0) {
      db.prepare('UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?').run(coinsAwarded, user.id);
      db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
        user.id,
        'kirim',
        coinsAwarded,
        'Sifatli kitob sharhi uchun bonus',
        now
      );
    }
  })();

  res.json({
    success: true,
    coinsEarned: coinsAwarded,
    isApproved: isApproved === 1,
    message: coinsAwarded > 0 ? '+10 Coin berildi!' : 'Sharhingiz qabul qilindi',
  });
});

router.post('/books/:id/order-physical', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const bookId = req.params.id;
  const { phone, address, notes } = req.body;

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as any;
  if (!book) return res.status(404).json({ error: 'Kitob topilmadi' });

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO orders (user_id, market_item_id, status, phone, address, notes, created_at)
    VALUES (?, ?, 'kutilmoqda', ?, ?, ?, ?)
  `).run(user.id, book.id, phone, address, `Kitob xaridi: ${book.title}. ${notes || ''}`, now);

  res.json({ success: true, message: 'Buyurtmangiz qabul qilindi. Tez orada operatorlarimiz bog‘lanadi.' });
});

// ==========================================
// 3. QUIZZES & CUP (KUBOK)
// ==========================================

router.get('/quizzes', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;

  const quizzes = db
    .prepare(`
      SELECT q.*, b.title as book_title, b.cover_url as book_cover, b.author as book_author,
        (SELECT COALESCE(SUM(s.pages_read), 0) FROM reading_sessions s WHERE s.book_id = q.book_id AND s.user_id = ?) as user_pages_read,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.quiz_id = q.id AND a.user_id = ? AND a.passed = 1) as is_completed,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.quiz_id = q.id) as participants_count
      FROM quizzes q
      LEFT JOIN books b ON b.id = q.book_id
      WHERE q.is_active = 1
      ORDER BY q.id ASC
    `)
    .all(user.id, user.id) as any[];

  const mapped = quizzes.map((quiz) => {
    const minPages = quiz.min_pages_required || 0;
    const userPages = quiz.user_pages_read || 0;
    const isUnlocked = userPages >= minPages;
    return {
      ...quiz,
      isUnlocked,
      pagesRemaining: Math.max(0, minPages - userPages),
    };
  });

  res.json({ quizzes: mapped });
});

router.get('/quizzes/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const quizId = req.params.id;

  const quiz = db
    .prepare(`
      SELECT q.*, b.title as book_title, b.cover_url as book_cover,
        (SELECT COALESCE(SUM(s.pages_read), 0) FROM reading_sessions s WHERE s.book_id = q.book_id AND s.user_id = ?) as user_pages_read
      FROM quizzes q
      LEFT JOIN books b ON b.id = q.book_id
      WHERE q.id = ?
    `)
    .get(user.id, quizId) as any;

  if (!quiz) return res.status(404).json({ error: 'Test topilmadi' });

  const userPages = quiz.user_pages_read || 0;
  if (userPages < quiz.min_pages_required) {
    return res.status(403).json({
      error: `Test bloklangan. Testni ochish uchun kitobni kamida ${quiz.min_pages_required} bet o‘qishingiz kerak. Hozirda: ${userPages} bet.`,
      isLocked: true,
      minPagesRequired: quiz.min_pages_required,
      userPagesRead: userPages,
    });
  }

  const questions = db
    .prepare(`
      SELECT id, question_text, options, time_limit_seconds
      FROM quiz_questions
      WHERE quiz_id = ?
      ORDER BY id ASC
    `)
    .all(quizId) as any[];

  const formattedQuestions = questions.map((q) => ({
    id: q.id,
    questionText: q.question_text,
    options: JSON.parse(q.options),
    timeLimitSeconds: q.time_limit_seconds,
  }));

  res.json({ quiz, questions: formattedQuestions });
});

router.post('/quizzes/:id/submit', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const quizId = req.params.id;
  const { userAnswers } = req.body;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId) as any;
  if (!quiz) return res.status(404).json({ error: 'Test topilmadi' });

  const questions = db.prepare('SELECT id, correct_option FROM quiz_questions WHERE quiz_id = ?').all(quizId) as any[];

  let correctCount = 0;
  const answersMap = new Map();
  if (Array.isArray(userAnswers)) {
    userAnswers.forEach((a: any) => {
      answersMap.set(a.questionId, a.selectedOption);
    });
  }

  questions.forEach((q) => {
    const selected = answersMap.get(q.id);
    if (selected === q.correct_option) {
      correctCount++;
    }
  });

  const totalQuestions = questions.length || 1;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const passed = scorePercent >= quiz.pass_threshold_percent ? 1 : 0;
  const now = new Date().toISOString();

  const prevPassed = db
    .prepare('SELECT id FROM quiz_attempts WHERE user_id = ? AND quiz_id = ? AND passed = 1')
    .get(user.id, quizId);

  let coinsEarned = 0;
  if (passed && !prevPassed) {
    coinsEarned = quiz.reward_coins || 0;
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO quiz_attempts (user_id, quiz_id, score_percent, correct_answers, total_questions, passed, coins_earned, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, quizId, scorePercent, correctCount, totalQuestions, passed, coinsEarned, now);

    if (coinsEarned > 0) {
      db.prepare('UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?').run(coinsEarned, user.id);
      db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
        user.id,
        'kirim',
        coinsEarned,
        `"${quiz.title}" testidan o‘tganlik uchun mukofot`,
        now
      );

      if (quiz.reward_premium_days > 0) {
        const until = new Date(Date.now() + quiz.reward_premium_days * 86400000).toISOString();
        db.prepare('UPDATE users SET is_premium = 1, premium_until = ? WHERE id = ?').run(until, user.id);
      }
    }
  })();

  res.json({
    passed: passed === 1,
    scorePercent,
    correctCount,
    totalQuestions,
    coinsEarned,
    isFirstPass: passed === 1 && !prevPassed,
    message:
      passed === 1
        ? `Tabriklaymiz! Siz testdan muvaffaqiyatli o‘tdingiz va ${coinsEarned} Coin yutib oldingiz!`
        : `Afsuski, natijangiz yetarli bo‘lmadi (${scorePercent}%). Qayta o‘qib urinib ko‘ring.`,
  });
});

// ==========================================
// 4. CONTESTS & LEADERBOARD (TANLOV)
// ==========================================

router.get('/contests', (req: AuthenticatedRequest, res: Response) => {
  const contests = db.prepare('SELECT * FROM contests WHERE is_active = 1 ORDER BY id DESC').all();
  res.json({ contests });
});

router.get('/contests/leaderboard', (req: AuthenticatedRequest, res: Response) => {
  const topUsers = db
    .prepare(`
      SELECT u.id, u.telegram_id, u.full_name, u.username, u.avatar_url, u.coin_balance, u.streak_days,
        (SELECT COUNT(DISTINCT s.book_id) FROM reading_sessions s WHERE s.user_id = u.id) as books_read_count,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.user_id = u.id AND a.passed = 1) as quizzes_passed_count
      FROM users u
      ORDER BY u.coin_balance DESC, u.streak_days DESC
      LIMIT 20
    `)
    .all();

  res.json({ leaderboard: topUsers });
});

// ==========================================
// 5. MARKET & ORDERS
// ==========================================

router.get('/market/items', (req: AuthenticatedRequest, res: Response) => {
  const { category } = req.query;
  let query = 'SELECT * FROM market_items WHERE is_active = 1';
  const params: any[] = [];

  if (category && category !== 'Barchasi') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY price_coins ASC';
  const items = db.prepare(query).all(...params);
  res.json({ items });
});

router.post('/market/buy', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const { itemId, phone, address, notes } = req.body;

  const item = db.prepare('SELECT * FROM market_items WHERE id = ?').get(itemId) as any;
  if (!item) return res.status(404).json({ error: 'Mahsulot topilmadi' });
  if (item.stock <= 0) return res.status(400).json({ error: 'Mahsulot qolmagan' });

  if (user.coin_balance < item.price_coins) {
    return res.status(400).json({ error: `Coinlaringiz yetarli emas. Narxi: ${item.price_coins} Coin.` });
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare('UPDATE users SET coin_balance = coin_balance - ? WHERE id = ?').run(item.price_coins, user.id);
    db.prepare('UPDATE market_items SET stock = stock - 1 WHERE id = ?').run(item.id);

    db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
      user.id,
      'chiqim',
      item.price_coins,
      `Market xaridi: ${item.title}`,
      now
    );

    db.prepare(`
      INSERT INTO orders (user_id, market_item_id, status, phone, address, notes, created_at)
      VALUES (?, ?, 'kutilmoqda', ?, ?, ?, ?)
    `).run(user.id, item.id, phone || null, address || null, notes || null, now);

    if (item.category === 'sertifikat') {
      const code = 'KBX-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      db.prepare(`
        INSERT INTO certificates (user_id, title, achievement, certificate_code, issued_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(user.id, item.title, 'Faol Kitobxon yutug‘i', code, now);
    }
  })();

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({
    success: true,
    message: 'Xarid muvaffaqiyatli amalga oshirildi!',
    coinBalance: (updatedUser as any).coin_balance,
  });
});

router.get('/market/my-orders', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const orders = db
    .prepare(`
      SELECT o.*, m.title as item_title, m.image_url as item_image, m.price_coins
      FROM orders o
      JOIN market_items m ON m.id = o.market_item_id
      WHERE o.user_id = ?
      ORDER BY o.id DESC
    `)
    .all(user.id);
  res.json({ orders });
});

// ==========================================
// 6. CERTIFICATES
// ==========================================

router.get('/certificates/my', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const certificates = db
    .prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY id DESC')
    .all(user.id);
  res.json({ certificates });
});

router.post('/certificates/generate', (req: AuthenticatedRequest, res: Response) => {
  const user = req.dbUser;
  const { title, achievement } = req.body;

  const code = 'KBX-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const now = new Date().toISOString();

  const resDb = db.prepare(`
    INSERT INTO certificates (user_id, title, achievement, certificate_code, issued_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, title || 'Kitobxonlik Yutuq Sertifikati', achievement || 'O‘qish va viktorinalarda faol ishtiroki uchun', code, now);

  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(resDb.lastInsertRowid);
  res.json({ success: true, certificate: cert });
});

// ==========================================
// 7. BANNERS & NOTIFICATIONS
// ==========================================

router.get('/banners', (_req: AuthenticatedRequest, res: Response) => {
  const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY id DESC').all();
  res.json({ banners });
});

router.get('/notifications', (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    notifications: [
      {
        id: 1,
        title: 'Yangi Kubok testi ochildi! 🏆',
        message: '“Atom odatlari” kitobi bo‘yicha testda qatnashing va Coin ishlang.',
        time: 'Bugun, 14:00',
        read: false,
      },
      {
        id: 2,
        title: 'Do‘stlar aksiyasi 🎟️',
        message: '5 ta do‘stingizni taklif qiling va kafolatlangan 250 Coin mukofotiga ega bo‘ling!',
        time: 'Kecha, 18:30',
        read: true,
      },
    ],
  });
});

// ==========================================
// 8. ADMIN API
// ==========================================

function requireAdmin(req: AuthenticatedRequest, res: Response, next: Function) {
  const user = req.dbUser;
  const isAdmin =
    config.adminTelegramIds.includes(user?.telegram_id) ||
    user?.telegram_id === '123456789';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Faqat adminlar uchun ruxsat berilgan' });
  }
  next();
}

router.get('/admin/stats', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const usersCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const booksCount = (db.prepare('SELECT COUNT(*) as c FROM books').get() as any).c;
  const quizzesCount = (db.prepare('SELECT COUNT(*) as c FROM quizzes').get() as any).c;
  const ordersCount = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
  const pendingReviewsCount = (db.prepare('SELECT COUNT(*) as c FROM reviews WHERE is_quality_approved = 0').get() as any).c;

  res.json({
    usersCount,
    booksCount,
    quizzesCount,
    ordersCount,
    pendingReviewsCount,
  });
});

router.post('/admin/books', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { title, author, cover_url, description, category, price, pages_count, preview_pages, unlock_price_coins, sample_content } = req.body;
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO books (title, author, cover_url, description, category, price, pages_count, preview_pages, unlock_price_coins, sample_content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, author, cover_url, description, category || 'Badiiy', price || 0, pages_count || 100, preview_pages || 10, unlock_price_coins || 50, sample_content, now);

  const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, book: newBook });
});

router.delete('/admin/books/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/admin/quizzes', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { book_id, title, description, questions_count, pass_threshold_percent, reward_coins, min_pages_required, time_per_question_seconds, questions } = req.body;
  const now = new Date().toISOString();

  db.transaction(() => {
    const qResult = db.prepare(`
      INSERT INTO quizzes (book_id, title, description, questions_count, pass_threshold_percent, reward_coins, min_pages_required, time_per_question_seconds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(book_id || null, title, description, questions_count || 5, pass_threshold_percent || 70, reward_coins || 100, min_pages_required || 20, time_per_question_seconds || 40, now);

    const quizId = qResult.lastInsertRowid;

    if (Array.isArray(questions)) {
      const insertQ = db.prepare(`
        INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option, time_limit_seconds)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const q of questions) {
        insertQ.run(quizId, q.questionText, JSON.stringify(q.options), q.correctOption, q.timeLimitSeconds || 40);
      }
    }
  })();

  res.json({ success: true });
});

router.get('/admin/reviews', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, u.full_name, u.username, b.title as book_title
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN books b ON b.id = r.book_id
    ORDER BY r.id DESC
    LIMIT 50
  `).all();
  res.json({ reviews });
});

router.post('/admin/reviews/:id/moderate', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.id;
  const { approve } = req.body;

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as any;
  if (!review) return res.status(404).json({ error: 'Sharh topilmadi' });

  const now = new Date().toISOString();
  if (approve) {
    db.transaction(() => {
      db.prepare('UPDATE reviews SET is_quality_approved = 1, coins_earned = 10 WHERE id = ?').run(reviewId);
      db.prepare('UPDATE users SET coin_balance = coin_balance + 10 WHERE id = ?').run(review.user_id);
      db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
        review.user_id,
        'kirim',
        10,
        'Tasdiqlangan sharh uchun mukofot',
        now
      );
    })();
  } else {
    db.prepare('UPDATE reviews SET is_quality_approved = -1 WHERE id = ?').run(reviewId);
  }

  res.json({ success: true });
});

router.get('/admin/orders', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const orders = db.prepare(`
    SELECT o.*, u.full_name, u.username, u.telegram_id, m.title as item_title, m.price_coins
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN market_items m ON m.id = o.market_item_id
    ORDER BY o.id DESC
  `).all();
  res.json({ orders });
});

router.post('/admin/orders/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

export default router;
