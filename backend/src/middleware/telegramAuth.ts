import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import db from '../db/db.js';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface AuthenticatedRequest extends Request {
  telegramUser?: TelegramUser;
  dbUser?: any;
}

export function verifyTelegramWebAppData(telegramInitData: string, botToken: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    urlParams.delete('hash');
    const params: string[] = [];
    urlParams.forEach((val, key) => {
      params.push(`${key}=${val}`);
    });
    params.sort();

    const dataCheckString = params.join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash === hash) {
      const userString = urlParams.get('user');
      if (userString) {
        return JSON.parse(userString) as TelegramUser;
      }
    }
    return null;
  } catch (err) {
    console.error('Error verifying Telegram initData:', err);
    return null;
  }
}

export function telegramAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const initData = (req.headers['x-telegram-init-data'] as string) || (req.query.initData as string);

  let tgUser: TelegramUser | null = null;

  if (initData) {
    tgUser = verifyTelegramWebAppData(initData, config.botToken);
  }

  // Fallback for local browser testing & dev mode
  if (!tgUser) {
    // If dev or header present
    const mockId = (req.headers['x-mock-user-id'] as string) || '123456789';
    const mockName = (req.headers['x-mock-user-name'] as string) || 'Azizbek Rahimov';
    const mockUsername = (req.headers['x-mock-username'] as string) || 'azizbek_reader';

    tgUser = {
      id: parseInt(mockId, 10),
      first_name: mockName,
      username: mockUsername,
    };
  }

  req.telegramUser = tgUser;

  // Find or create DB user
  const tgIdStr = tgUser.id.toString();
  let dbUser = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(tgIdStr) as any;

  const now = new Date().toISOString();

  if (!dbUser) {
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Kitobxon';
    const result = db.prepare(`
      INSERT INTO users (telegram_id, username, full_name, avatar_url, coin_balance, streak_days, last_active_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tgIdStr,
      tgUser.username || null,
      fullName,
      tgUser.photo_url || null,
      50, // 50 welcome coins
      1,
      now,
      now
    );

    // Add welcome transaction
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(result.lastInsertRowid, 'kirim', 50, 'Xush kelibsiz bonusi', now);

    dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  } else {
    // Update streak and last_active
    const lastActive = dbUser.last_active_at ? new Date(dbUser.last_active_at) : null;
    const today = new Date();
    
    if (lastActive) {
      const diffHours = (today.getTime() - lastActive.getTime()) / (1000 * 3600);
      if (diffHours >= 24 && diffHours < 48) {
        // Increment streak
        const newStreak = (dbUser.streak_days || 0) + 1;
        db.prepare('UPDATE users SET streak_days = ?, last_active_at = ? WHERE id = ?').run(newStreak, now, dbUser.id);
        dbUser.streak_days = newStreak;
      } else if (diffHours >= 48) {
        // Reset streak to 1
        db.prepare('UPDATE users SET streak_days = 1, last_active_at = ? WHERE id = ?').run(now, dbUser.id);
        dbUser.streak_days = 1;
      } else {
        db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(now, dbUser.id);
      }
    }
  }

  req.dbUser = dbUser;
  next();
}
