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

// Telegram Webhook Handler (Must be BEFORE telegramAuthMiddleware so Telegram server requests aren't intercepted)
app.post('/api/telegram-webhook', (req, res) => {
  bot.handleUpdate(req.body, res).catch((err) => {
    console.error('Error handling telegram update:', err);
    if (!res.headersSent) res.sendStatus(200);
  });
});

// Static uploads with robust directory detection
const uploadsDir = [
  path.resolve(process.cwd(), 'backend/uploads'),
  path.resolve(__dirname, '../uploads'),
  path.resolve(__dirname, '../../backend/uploads'),
  path.resolve(__dirname, '../../uploads'),
  path.resolve(process.cwd(), 'uploads'),
].find((p) => fs.existsSync(p)) || path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    webAppUrl: config.webAppUrl,
    mode: config.webAppUrl.startsWith('https://') ? 'webhook' : 'polling',
  });
});

// API Routes with Telegram Auth
app.use('/api', telegramAuthMiddleware as any, apiRouter);

// High-speed Production Frontend Serving
const frontendDist = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
].find((p) => fs.existsSync(p)) || path.resolve(__dirname, '../../frontend/dist');

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

    console.log('Initializing Telegraf Bot...');
    initBot();

    const isProductionWebhook = config.webAppUrl.startsWith('https://');

    if (isProductionWebhook) {
      const webhookUrl = `${config.webAppUrl}/api/telegram-webhook`;
      console.log(`📡 Configuring Telegram Webhook to: ${webhookUrl}`);
      try {
        await bot.telegram.setWebhook(webhookUrl, { drop_pending_updates: false });
        console.log(`✅ Telegram Webhook set successfully at: ${webhookUrl}`);
      } catch (err: any) {
        console.error('⚠️ Failed to set Telegram Webhook:', err.message);
      }
    } else {
      console.log('⚡ Running in local polling mode...');
      await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
      bot.launch().catch((err: any) => {
        console.warn('⚠️ Telegram Bot polling warning:', err.message);
      });
    }

    // Start Express Server
    app.listen(config.port, () => {
      console.log(`🚀 KITOBXON Ultra-Fast Server is listening on port ${config.port}`);
      console.log(`🌐 Mini App configured URL: ${config.webAppUrl}`);
    });

    // Keep-alive pinger for free tier hosting (Render, Koyeb, etc.)
    if (config.webAppUrl.startsWith('https://')) {
      setInterval(async () => {
        try {
          await fetch(`${config.webAppUrl}/health`);
        } catch (_) {}
      }, 8 * 60 * 1000); // Ping every 8 minutes
    }
  } catch (error) {
    console.error('Fatal initialization error:', error);
  }
}

startServer();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
