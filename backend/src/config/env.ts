import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  botToken: process.env.BOT_TOKEN || '8897934466:AAHzslRCRQZJxzvdFXrCKAOPsC0XMVILUwQ',
  webAppUrl: process.env.WEBAPP_URL || 'http://localhost:5173',
  databasePath: process.env.DATABASE_PATH || './kitobxon.db',
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '185791049,5435079143,8420258761')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  isDev: process.env.NODE_ENV !== 'production',
};
