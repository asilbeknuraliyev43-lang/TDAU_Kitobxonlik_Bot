import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getActiveWebAppUrl(): string {
  // 1. If running on Render, RENDER_EXTERNAL_URL is set automatically by Render
  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.startsWith('http')) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  }

  // 2. If WEBAPP_URL is explicitly set and is not an old trycloudflare domain
  if (process.env.WEBAPP_URL && !process.env.WEBAPP_URL.includes('trycloudflare.com')) {
    return process.env.WEBAPP_URL.replace(/\/$/, '');
  }

  if (process.env.WEBAPP_URL) {
    return process.env.WEBAPP_URL.replace(/\/$/, '');
  }

  return 'http://localhost:5173';
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  botToken: process.env.BOT_TOKEN || '8897934466:AAHzslRCRQZJxzvdFXrCKAOPsC0XMVILUwQ',
  webAppUrl: getActiveWebAppUrl(),
  databasePath: process.env.DATABASE_PATH || './kitobxon.db',
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '185791049,5435079143,8420258761')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  isDev: process.env.NODE_ENV !== 'production',
};
