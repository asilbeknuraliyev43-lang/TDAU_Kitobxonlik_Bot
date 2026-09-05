import express from 'express';
import cors from 'cors';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { initDb } from './db/db.js';
import { bot, initBot } from './bot/bot.js';
import apiRouter from './routes/api.js';
import { telegramAuthMiddleware } from './middleware/telegramAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// High-speed Gzip / Deflate compression for all responses
app.use(compression());

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import fs from 'fs';

// Static uploads with robust directory detection
const uploadsDir = fs.existsSync(path.resolve(__dirname, '../uploads'))
  ? path.resolve(__dirname, '../uploads')
  : fs.existsSync(path.resolve(__dirname, '../../uploads'))
  ? path.resolve(__dirname, '../../uploads')
  : path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes with Telegram Auth
app.use('/api', telegramAuthMiddleware as any, apiRouter);

// High-speed Production Frontend Serving
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(
  express.static(frontendDist, {
    maxAge: '1y',
    immutable: true,
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// SPA fallback for all frontend routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

async function startServer() {
  try {
    console.log('Initializing SQLite (Wasm) Database...');
    await initDb();

    console.log('Starting Telegraf Bot...');
    initBot();
    bot
      .launch()
      .then(() => {
        console.log('✅ Telegram Bot is running in polling mode!');
      })
      .catch((err) => {
        console.warn('⚠️ Telegram Bot launch warning (check network or token):', err.message);
      });

    // Start Express Server
    app.listen(config.port, () => {
      console.log(`🚀 KITOBXON Ultra-Fast Server is listening on port ${config.port}`);
      console.log(`🌐 Mini App configured URL: ${config.webAppUrl}`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
  }
}

startServer();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
