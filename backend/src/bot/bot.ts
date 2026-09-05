import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import db, { calculateUserLevel } from '../db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BANNER_IMAGE_PATH = path.resolve(__dirname, '../../uploads/tdau_banner.jpg');

export const bot = new Telegraf(config.botToken);

function escapeHtml(str: string = ''): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const ADMIN_IDS = ['185791049', '5435079143', '8420258761'];

export function isAdmin(tgId: string | number): boolean {
  const idStr = tgId.toString();
  return ADMIN_IDS.includes(idStr) || config.adminTelegramIds.includes(idStr);
}

// Main Reply Keyboard
export const MAIN_REPLY_KEYBOARD = Markup.keyboard([
  ['📚 Kutubxona'],
  ['🎯 Tanlovlar va Testlar', '🎁 Sovg‘alar'],
  ['👤 Sahifam', '🏆 Reyting'],
  ['🎁 Kunlik bonus', '🎟️ Haftalik tanlov'],
  ['🤝 Do‘st taklif qilish', '📖 Qo‘llanma'],
]).resize();

// Helper to get WebApp Button
function getWebAppButton(text: string = '🚀 Mini Appni Ochish', path: string = '') {
  const url = path ? `${config.webAppUrl}#${path}` : config.webAppUrl;
  return Markup.inlineKeyboard([
    [Markup.button.webApp(text, url)],
  ]);
}

// Channels Required for Subscription
export const REQUIRED_CHANNELS = [
  { name: '1️⃣ TDAU Tafakkur Hamjamiyati', username: '@TDAU_tafakkur_hamjamiyati', url: 'https://t.me/TDAU_tafakkur_hamjamiyati' },
  { name: '2️⃣ Kitobxonlik Akademiyasi', username: '@Kitobxonlik_akademiyasi', url: 'https://t.me/Kitobxonlik_akademiyasi' },
  { name: '3️⃣ TDAU Tafakkur', username: '@tdau_tafakkur', url: 'https://t.me/tdau_tafakkur' },
  { name: '4️⃣ TDAU Sayohat', username: '@tdau_sayohat', url: 'https://t.me/tdau_sayohat' },
];

export async function checkUserSubscriptions(userId: number): Promise<{ allSubscribed: boolean; missing: typeof REQUIRED_CHANNELS }> {
  const missing: typeof REQUIRED_CHANNELS = [];
  for (const ch of REQUIRED_CHANNELS) {
    try {
      const member = await bot.telegram.getChatMember(ch.username, userId);
      const isSubscribed = ['member', 'administrator', 'creator'].includes(member.status);
      if (!isSubscribed) {
        missing.push(ch);
      }
    } catch (err: any) {
      console.warn(`Channel check warning for ${ch.username}:`, err.message);
    }
  }
  return { allSubscribed: missing.length === 0, missing };
}

// Helper guard for bot commands
async function ensureSubscribed(ctx: any): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  if (isAdmin(from.id)) return true;

  const subStatus = await checkUserSubscriptions(from.id);
  if (!subStatus.allSubscribed && subStatus.missing.length > 0) {
    // Reset custom menu button so they don't have bottom webapp button
    bot.telegram.setChatMenuButton({ chatId: from.id, menuButton: { type: 'default' } }).catch(() => {});

    const missingKeyboard = Markup.inlineKeyboard([
      ...subStatus.missing.map((ch) => [Markup.button.url(ch.name, ch.url)]),
      [Markup.button.callback('✅ Obunani tekshirish / Boshlash', 'check_subscription')],
    ]);

    await ctx.reply(
      `⛔ <b>Bot xizmatlaridan foydalanish uchun quyidagi rasmiy kanallarga a'zo bo‘lishingiz shart!</b>\n\nIltimos, ${subStatus.missing.length} ta kanalga a'zo bo‘ling va <b>"✅ Obunani tekshirish / Boshlash"</b> tugmasini bosing:`,
      { parse_mode: 'HTML', ...missingKeyboard }
    );
    return false;
  }
  return true;
}

export function initBot() {
  // Reset default chat menu button to standard default (removes global web_app button for unsubscribed users)
  bot.telegram
    .setChatMenuButton({
      menuButton: {
        type: 'default',
      },
    })
    .catch((err) => console.error('Menu button reset error:', err.message));

  // /start command
  bot.start(async (ctx) => {
    try {
      const from = ctx.from;
      if (!from) return;

      const tgIdStr = from.id.toString();
      const payload = ctx.startPayload; // e.g., "r_123456789"
      let referrerId: string | null = null;

      if (payload && payload.startsWith('r_')) {
        referrerId = payload.replace('r_', '').trim();
      }

      const now = new Date().toISOString();
      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Kitobxon';

      let existingUser = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(tgIdStr) as any;

      if (!existingUser) {
        const result = db.prepare(`
          INSERT INTO users (telegram_id, username, full_name, coin_balance, referred_by, streak_days, last_active_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          tgIdStr,
          from.username || null,
          fullName,
          100,
          referrerId,
          1,
          now,
          now
        );

        const newUserId = result.lastInsertRowid;
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, reason, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(newUserId, 'kirim', 100, 'Xush kelibsiz bonusi', now);

        if (referrerId && referrerId !== tgIdStr) {
          const referrer = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(referrerId) as any;
          if (referrer) {
            db.transaction(() => {
              db.prepare('INSERT INTO referrals (referrer_id, referred_user_id, created_at) VALUES (?, ?, ?)').run(
                referrerId,
                tgIdStr,
                now
              );
              db.prepare('UPDATE users SET coin_balance = coin_balance + 50 WHERE id = ?').run(referrer.id);
              db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
                referrer.id,
                'kirim',
                50,
                `Taklif qilingan do‘st (${fullName}) uchun bonus`,
                now
              );
            })();

            bot.telegram
              .sendMessage(
                referrerId,
                `🎉 Sizning referal havolangiz orqali <b>${escapeHtml(fullName)}</b> botga qo‘shildi!\nSizga <b>+50 Coin</b> taqdim etildi. 🪙`,
                { parse_mode: 'HTML' }
              )
              .catch(() => {});
          }
        }
      }

      // Check subscription
      const isUserAdmin = isAdmin(from.id);
      const subStatus = isUserAdmin ? { allSubscribed: true, missing: [] } : await checkUserSubscriptions(from.id);

      if (!subStatus.allSubscribed && subStatus.missing.length > 0) {
        // Reset chat menu button so they don't have bottom webapp button
        bot.telegram.setChatMenuButton({ chatId: from.id, menuButton: { type: 'default' } }).catch(() => {});

        const keyboard = Markup.inlineKeyboard([
          ...subStatus.missing.map((ch) => [Markup.button.url(ch.name, ch.url)]),
          [Markup.button.callback('✅ Obunani tekshirish / Boshlash', 'check_subscription')],
        ]);

        const subMsg = `👋 Assalomu alaykum, <b>${escapeHtml(fullName)}</b>!\n\n🏛️ <b>TDAU KITOBXONLIK AKADEMIYASI</b> ga xush kelibsiz!\n\nBotdan to‘liq foydalanish va bepul kitoblarni o‘qish uchun quyidagi <b>${subStatus.missing.length} ta</b> rasmiy kanalga a'zo bo‘lishingiz shart:`;

        return ctx.reply(subMsg, {
          parse_mode: 'HTML',
          ...keyboard,
        });
      }

      // User IS subscribed: set personal menu button
      await bot.telegram.setChatMenuButton({
        chatId: from.id,
        menuButton: {
          type: 'web_app',
          text: '🚀 Ilovani Ochish',
          web_app: {
            url: config.webAppUrl,
          },
        },
      }).catch(() => {});

      const welcomeCaption = `👋 Assalomu alaykum, <b>${escapeHtml(fullName)}</b>!\n\n` +
        `🏛️ <b>TDAU KITOBXONLIK AKADEMIYASI</b> ga xush kelibsiz!\n\n` +
        `Bu yerda siz:\n` +
        `📖 Haqiqiy PDF kitoblarni sifatli o‘qiysiz (50 bet bepul!)\n` +
        `⏱️ Mutolaa taymeri orqali bilim va diqqatni oshirasiz\n` +
        `🎁 10 ta kitob o‘qib <b>Maxsus Oltin Keys</b> ni ochasiz!\n` +
        `🪙 Coinlar yig‘ib qimmatbaho sovg‘alarga ega bo‘lasiz!\n\n` +
        `👇 <b>Quyidagi tugma orqali ilovani oching:</b>`;

      if (fs.existsSync(BANNER_IMAGE_PATH)) {
        await ctx.replyWithPhoto(
          { source: BANNER_IMAGE_PATH },
          {
            caption: welcomeCaption,
            parse_mode: 'HTML',
            ...getWebAppButton('🚀 Akademiyani Ochish'),
          }
        );
      } else {
        await ctx.reply(welcomeCaption, {
          parse_mode: 'HTML',
          ...getWebAppButton('🚀 Akademiyani Ochish'),
        });
      }

      await ctx.reply('Asosiy menyu faollashtirildi 👇', MAIN_REPLY_KEYBOARD);
    } catch (err) {
      console.error('Error handling /start:', err);
      ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring.', MAIN_REPLY_KEYBOARD);
    }
  });

  // Handle check_subscription callback
  bot.action('check_subscription', async (ctx) => {
    try {
      const from = ctx.from;
      if (!from) return;

      const subStatus = await checkUserSubscriptions(from.id);

      if (!subStatus.allSubscribed && subStatus.missing.length > 0) {
        await ctx.answerCbQuery('⚠️ Siz hali barcha kanallarga a\'zo bo‘lmadingiz!', { show_alert: true });
        const missingKeyboard = Markup.inlineKeyboard([
          ...subStatus.missing.map((ch) => [Markup.button.url(ch.name, ch.url)]),
          [Markup.button.callback('🔄 Qayta tekshirish', 'check_subscription')],
        ]);

        return ctx.reply(
          `⚠️ <b>Siz hali barcha kanallarga a'zo bo‘lmadingiz!</b>\n\nIltimos, quyidagi <b>${subStatus.missing.length} ta</b> kanalga a'zo bo‘ling va keyin <b>"🔄 Qayta tekshirish"</b> tugmasini bosing:`,
          { parse_mode: 'HTML', ...missingKeyboard }
        );
      }

      // User IS subscribed to all 4 channels!
      // Set chat menu button ONLY for this verified user
      await bot.telegram.setChatMenuButton({
        chatId: from.id,
        menuButton: {
          type: 'web_app',
          text: '🚀 Ilovani Ochish',
          web_app: {
            url: config.webAppUrl,
          },
        },
      }).catch(() => {});

      const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Kitobxon';
      await ctx.answerCbQuery('✅ Barcha kanallarga a\'zolik tasdiqlandi! 🌟');

      const welcomeCaption = `👋 Assalomu alaykum, <b>${escapeHtml(fullName)}</b>!\n\n` +
        `🏛️ <b>TDAU KITOBXONLIK AKADEMIYASI</b> ga xush kelibsiz!\n\n` +
        `Bu yerda siz:\n` +
        `📖 Haqiqiy PDF kitoblarni sifatli o‘qiysiz (50 bet bepul!)\n` +
        `⏱️ Mutolaa taymeri orqali bilim va diqqatni oshirasiz\n` +
        `🎁 10 ta kitob o‘qib <b>Maxsus Oltin Keys</b> ni ochasiz!\n` +
        `🪙 Coinlar yig‘ib qimmatbaho sovg‘alarga ega bo‘lasiz!\n\n` +
        `👇 <b>Quyidagi tugma orqali ilovani oching:</b>`;

      if (fs.existsSync(BANNER_IMAGE_PATH)) {
        await ctx.replyWithPhoto(
          { source: BANNER_IMAGE_PATH },
          {
            caption: welcomeCaption,
            parse_mode: 'HTML',
            ...getWebAppButton('🚀 Akademiyani Ochish'),
          }
        );
      } else {
        await ctx.reply(welcomeCaption, {
          parse_mode: 'HTML',
          ...getWebAppButton('🚀 Akademiyani Ochish'),
        });
      }

      await ctx.reply('Asosiy menyu faollashtirildi 👇', MAIN_REPLY_KEYBOARD);
    } catch (err) {
      console.error('Error on check_subscription:', err);
    }
  });

  // ==========================================
  // 👑 ADMIN PANEL COMMANDS (/admin, /broadcast, /addcoins, /orders)
  // ==========================================

  bot.command('admin', async (ctx) => {
    try {
      const from = ctx.from;
      if (!from || !isAdmin(from.id)) {
        return ctx.reply('⛔ Sizda adminlik huquqi mavjud emas.');
      }

      const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
      const totalBooks = (db.prepare('SELECT COUNT(*) as c FROM books').get() as any)?.c || 0;
      const totalReadingSessions = (db.prepare('SELECT COUNT(*) as c, COALESCE(SUM(duration_seconds),0) as s FROM reading_sessions').get() as any);
      const totalCoins = (db.prepare('SELECT COALESCE(SUM(coin_balance), 0) as s FROM users').get() as any)?.s || 0;
      const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders WHERE status = "kutilmoqda"').get() as any)?.c || 0;
      const totalReferrals = (db.prepare('SELECT COUNT(*) as c FROM referrals').get() as any)?.c || 0;

      const totalHours = (totalReadingSessions.s / 3600).toFixed(1);

      const adminMsg = `👑 <b>TDAU KITOBXONLIK — Boshqaruv Paneli</b>\n\n` +
        `📊 <b>Real-vaqtdagi statistika:</b>\n` +
        `👥 <b>Jami foydalanuvchilar:</b> ${totalUsers} nafar\n` +
        `📚 <b>Mavjud kitoblar:</b> ${totalBooks} ta\n` +
        `⏱️ <b>Jami mutolaa vaqti:</b> ${totalHours} soat\n` +
        `🤝 <b>Jami taklif qilingan do‘stlar:</b> ${totalReferrals} ta\n` +
        `🪙 <b>Aylanmadagi jami Coinlar:</b> ${totalCoins.toLocaleString()} Coin\n` +
        `📦 <b>Kutilayotgan buyurtmalar:</b> ${totalOrders} ta\n\n` +
        `🛠️ <b>Buyruqlar ro‘yxati:</b>\n` +
        `📢 <code>/broadcast &lt;xabar&gt;</code> — Barcha foydalanuvchilarga xabar tarqatish\n` +
        `➕ <code>/addcoins &lt;telegram_id&gt; &lt;miqdor&gt;</code> — Foydalanuvchiga Coin qo‘shish\n` +
        `➖ <code>/removecoins &lt;telegram_id&gt; &lt;miqdor&gt;</code> — Foydalanuvchidan Coin ayirish\n` +
        `📦 <code>/orders</code> — Oxirgi buyurtmalarni ko‘rish\n`;

      await ctx.reply(adminMsg, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🚀 Mini App Admin Dashboard', `${config.webAppUrl}#admin`)],
          [Markup.button.callback('🔄 Yangilash', 'admin_refresh_stats')],
        ]),
      });
    } catch (err) {
      console.error('Error on /admin:', err);
    }
  });

  bot.action('admin_refresh_stats', async (ctx) => {
    try {
      const from = ctx.from;
      if (!from || !isAdmin(from.id)) return ctx.answerCbQuery('Ruxsat yo‘q');

      const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
      const totalCoins = (db.prepare('SELECT COALESCE(SUM(coin_balance), 0) as s FROM users').get() as any)?.s || 0;
      const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders WHERE status = "kutilmoqda"').get() as any)?.c || 0;
      const totalReferrals = (db.prepare('SELECT COUNT(*) as c FROM referrals').get() as any)?.c || 0;

      await ctx.answerCbQuery('Statistika yangilandi! ⚡');
      await ctx.editMessageText(
        `👑 <b>TDAU KITOBXONLIK — Real-time Statistika:</b>\n\n` +
        `👥 <b>Foydalanuvchilar:</b> ${totalUsers} ta\n` +
        `🤝 <b>Referallar:</b> ${totalReferrals} ta\n` +
        `🪙 <b>Jami Coinlar:</b> ${totalCoins.toLocaleString()} Coin\n` +
        `📦 <b>Kutilayotgan buyurtmalar:</b> ${totalOrders} ta\n\n` +
        `<i>So‘nggi yangilanish: ${new Date().toLocaleTimeString()}</i>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Mini App Admin Dashboard', `${config.webAppUrl}#admin`)],
            [Markup.button.callback('🔄 Yangilash', 'admin_refresh_stats')],
          ]),
        }
      );
    } catch (err) {
      console.error(err);
    }
  });

  // /broadcast command
  bot.command('broadcast', async (ctx) => {
    try {
      const from = ctx.from;
      if (!from || !isAdmin(from.id)) return ctx.reply('⛔ Ruxsat yo‘q.');

      const text = ctx.message.text.replace('/broadcast', '').trim();
      if (!text) {
        return ctx.reply('Xabar matnini kiriting. Masalan:\n<code>/broadcast Yangi kitob qo‘shildi!</code>', { parse_mode: 'HTML' });
      }

      const users = db.prepare('SELECT telegram_id FROM users').all() as { telegram_id: string }[];
      let sentCount = 0;

      ctx.reply(`📢 Xabar ${users.length} nafar foydalanuvchiga yuborilmoqda...`);

      for (const u of users) {
        try {
          await bot.telegram.sendMessage(u.telegram_id, `📢 <b>KITOBXONLIK E'LONI:</b>\n\n${escapeHtml(text)}`, { parse_mode: 'HTML' });
          sentCount++;
        } catch (_) {}
      }

      ctx.reply(`✅ Xabar muvaffaqiyatli ${sentCount} ta foydalanuvchiga yetkazildi!`);
    } catch (err) {
      console.error('Error on broadcast:', err);
    }
  });

  // /addcoins <tg_id> <amount>
  bot.command('addcoins', async (ctx) => {
    try {
      const from = ctx.from;
      if (!from || !isAdmin(from.id)) return ctx.reply('⛔ Ruxsat yo‘q.');

      const parts = ctx.message.text.split(' ').filter(Boolean);
      if (parts.length < 3) {
        return ctx.reply('Format: <code>/addcoins &lt;telegram_id&gt; &lt;miqdor&gt;</code>', { parse_mode: 'HTML' });
      }

      const targetId = parts[1];
      const amount = parseInt(parts[2], 10);

      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('Miqdor musbat son bo‘lishi kerak.');
      }

      const targetUser = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(targetId) as any;
      if (!targetUser) {
        return ctx.reply(`Bunday telegram ID li foydalanuvchi topilmadi: ${targetId}`);
      }

      const now = new Date().toISOString();
      db.transaction(() => {
        db.prepare('UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?').run(amount, targetUser.id);
        db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
          targetUser.id,
          'kirim',
          amount,
          'Admin tomonidan qo‘shilgan Coin',
          now
        );
      })();

      const updated = db.prepare('SELECT coin_balance FROM users WHERE id = ?').get(targetUser.id) as any;

      try {
        await bot.telegram.sendMessage(
          targetId,
          `🎁 <b>Admin sizning hisobingizga +${amount} Coin qo‘shdi!</b> 🪙\nJoriy balansingiz: <b>${updated.coin_balance.toLocaleString()} Coin</b>.`,
          { parse_mode: 'HTML' }
        );
      } catch (_) {}

      ctx.reply(`✅ ${targetUser.full_name} (${targetId}) hisobiga +${amount} Coin qo‘shildi. Yangi balans: ${updated.coin_balance} Coin.`);
    } catch (err) {
      console.error('Error on addcoins:', err);
    }
  });

  // /removecoins <tg_id> <amount>
  bot.command('removecoins', async (ctx) => {
    try {
      const from = ctx.from;
      if (!from || !isAdmin(from.id)) return ctx.reply('⛔ Ruxsat yo‘q.');

      const parts = ctx.message.text.split(' ').filter(Boolean);
      if (parts.length < 3) {
        return ctx.reply('Format: <code>/removecoins &lt;telegram_id&gt; &lt;miqdor&gt;</code>', { parse_mode: 'HTML' });
      }

      const targetId = parts[1];
      const amount = parseInt(parts[2], 10);

      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('Miqdor musbat son bo‘lishi kerak.');
      }

      const targetUser = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(targetId) as any;
      if (!targetUser) {
        return ctx.reply(`Bunday telegram ID li foydalanuvchi topilmadi: ${targetId}`);
      }

      const now = new Date().toISOString();
      db.transaction(() => {
        db.prepare('UPDATE users SET coin_balance = MAX(0, coin_balance - ?) WHERE id = ?').run(amount, targetUser.id);
        db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
          targetUser.id,
          'chiqim',
          amount,
          'Admin tomonidan ayirilgan Coin',
          now
        );
      })();

      const updated = db.prepare('SELECT coin_balance FROM users WHERE id = ?').get(targetUser.id) as any;

      try {
        await bot.telegram.sendMessage(
          targetId,
          `ℹ️ <b>Admin hisobingizdan -${amount} Coin ayirdi.</b> 🪙\nJoriy balansingiz: <b>${updated.coin_balance.toLocaleString()} Coin</b>.`,
          { parse_mode: 'HTML' }
        );
      } catch (_) {}

      ctx.reply(`✅ ${targetUser.full_name} (${targetId}) hisobidan -${amount} Coin ayirildi. Yangi balans: ${updated.coin_balance} Coin.`);
    } catch (err) {
      console.error('Error on removecoins:', err);
    }
  });

  // /orders command
  bot.command('orders', async (ctx) => {
    try {
      const from = ctx.from;
      if (!from || !isAdmin(from.id)) return ctx.reply('⛔ Ruxsat yo‘q.');

      const orders = db
        .prepare(`
          SELECT o.*, u.full_name, u.telegram_id, m.title as item_title, m.price_coins
          FROM orders o
          JOIN users u ON u.id = o.user_id
          JOIN market_items m ON m.id = o.market_item_id
          ORDER BY o.id DESC LIMIT 10
        `)
        .all() as any[];

      if (orders.length === 0) {
        return ctx.reply('📦 Hozircha buyurtmalar yo‘q.');
      }

      let msg = `📦 <b>Oxirgi Buyurtmalar (Top 10):</b>\n\n`;
      orders.forEach((o, i) => {
        msg += `<b>#${o.id}</b> | <b>${escapeHtml(o.item_title)}</b>\n` +
          `👤 <b>Mijoz:</b> ${escapeHtml(o.full_name)} (<code>${o.telegram_id}</code>)\n` +
          `📱 <b>Tel:</b> ${escapeHtml(o.phone || 'Kiritilmagan')}\n` +
          `📍 <b>Manzil:</b> ${escapeHtml(o.address || 'Kiritilmagan')}\n` +
          `🪙 <b>Narxi:</b> ${o.price_coins} Coin | Holat: <i>${o.status}</i>\n` +
          `---------------------------\n`;
      });

      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('Error on orders:', err);
    }
  });

  // Handle Contact sharing
  bot.on('contact', async (ctx) => {
    try {
      const contact = ctx.message.contact;
      const from = ctx.from;
      if (!contact || !from) return;

      const phone = contact.phone_number.startsWith('+') ? contact.phone_number : `+${contact.phone_number}`;
      db.prepare('UPDATE users SET phone_number = ?, is_profile_completed = 1 WHERE telegram_id = ?').run(
        phone,
        from.id.toString()
      );

      await ctx.reply(
        `✅ Telefon raqamingiz muvaffaqiyatli saqlandi: <b>${escapeHtml(phone)}</b>\nEndi profilingiz to‘liq tasdiqlandi! 🌟`,
        { parse_mode: 'HTML', ...MAIN_REPLY_KEYBOARD }
      );
    } catch (err) {
      console.error('Error on contact:', err);
    }
  });

  // 👤 Sahifam
  bot.hears('👤 Sahifam', async (ctx) => {
    if (!(await ensureSubscribed(ctx))) return;

    try {
      const tgIdStr = ctx.from?.id.toString();
      if (!tgIdStr) return;

      let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(tgIdStr) as any;
      if (!user) {
        ctx.reply('Iltimos, avval /start buyrug‘ini yuboring.', MAIN_REPLY_KEYBOARD);
        return;
      }

      const readBooksCount = (
        db.prepare('SELECT COUNT(DISTINCT book_id) as count FROM reading_sessions WHERE user_id = ? AND pages_read > 5').get(user.id) as any
      )?.count || 0;

      const rankInfo = calculateUserLevel(user.coin_balance || 0, readBooksCount);

      const referralCount = (
        db.prepare('SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?').get(tgIdStr) as { c: number }
      ).c;

      const usernameText = user.username ? `@${escapeHtml(user.username)}` : `@id${user.telegram_id}`;

      let profileText = `🏛️ <b>TDAU KITOBXONLIK PROFILI</b>\n\n` +
        `👤 <b>Ism:</b> ${escapeHtml(user.full_name)}\n` +
        `🆔 <b>Akkaunt:</b> ${usernameText}\n`;
      if (user.phone_number) {
        profileText += `📱 <b>Tel:</b> <code>${escapeHtml(user.phone_number)}</code>\n`;
      }
      profileText += `---------------------------\n`;
      profileText += `🪙 <b>Coin Balansi:</b> ${user.coin_balance?.toLocaleString('ru-RU') || 0} Coin\n`;
      profileText += `🎖️ <b>Maqom:</b> ${rankInfo.levelName} ${rankInfo.levelIcon}\n`;
      profileText += `📖 <b>O‘qilgan kitoblar:</b> ${readBooksCount} ta\n`;
      profileText += `🎁 <b>Oltin Keys ochilishiga:</b> ${rankInfo.booksLeftForKeys} ta kitob qoldi\n`;
      profileText += `${rankInfo.progressBar}\n\n`;
      profileText += `👥 <b>Taklif etilgan do‘stlar:</b> ${referralCount} nafar\n`;

      if (readBooksCount >= 1) {
        profileText += `✨ <i>1-kitobingiz o‘qilgan, bilimdonlik so‘rovnomasi ochildi!</i>\n`;
      }

      await ctx.reply(profileText, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📊 Mutolaa statistikasi', 'profile_reading_time')],
          [Markup.button.webApp('🚀 Profilni Mini Appda ochish', config.webAppUrl)],
        ]),
      });
    } catch (err) {
      console.error('Error on Sahifam:', err);
    }
  });

  // Inline callback for Mutolaa statistikasi
  bot.action('profile_reading_time', async (ctx) => {
    try {
      const tgIdStr = ctx.from?.id.toString();
      if (!tgIdStr) return;

      const user = db.prepare('SELECT id FROM users WHERE telegram_id = ?').get(tgIdStr) as any;
      if (!user) return;

      const sessions = db
        .prepare('SELECT COALESCE(SUM(duration_seconds), 0) as totalSec, COALESCE(SUM(pages_read), 0) as totalPages, COUNT(DISTINCT book_id) as totalBooks FROM reading_sessions WHERE user_id = ?')
        .get(user.id) as any;

      const totalSec = sessions?.totalSec || 0;
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);

      await ctx.answerCbQuery();
      await ctx.reply(
        `📊 <b>Sizning mutolaa ko‘rsatkichlaringiz:</b>\n\n⏱️ <b>Jami o‘qish vaqti:</b> ${hours} soat ${minutes} daqiqa\n📖 <b>O‘qilgan sahifalar:</b> ${sessions?.totalPages || 0} bet\n📚 <b>O‘qilgan kitoblar:</b> ${sessions?.totalBooks || 0} ta\n\n10 ta kitobni to‘liq mutolaa qiling va <b>Oltin Maxsus Keys</b> ni oching! 🌟`,
        {
          parse_mode: 'HTML',
          ...getWebAppButton('🚀 O‘qishni davom ettirish'),
        }
      );
    } catch (err) {
      console.error(err);
    }
  });

  // 🎁 Kunlik bonus
  bot.hears('🎁 Kunlik bonus', async (ctx) => {
    if (!(await ensureSubscribed(ctx))) return;

    try {
      const tgIdStr = ctx.from?.id.toString();
      if (!tgIdStr) return;

      let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(tgIdStr) as any;
      if (!user) return;

      const now = new Date();
      const lastBonus = user.last_daily_bonus_at ? new Date(user.last_daily_bonus_at) : null;

      let canClaim = true;
      let hoursLeft = 0;
      let minsLeft = 0;

      if (lastBonus) {
        const diffMs = now.getTime() - lastBonus.getTime();
        const diffHours = diffMs / (1000 * 3600);
        if (diffHours < 24) {
          canClaim = false;
          const remainingMs = 24 * 3600 * 1000 - diffMs;
          hoursLeft = Math.floor(remainingMs / (1000 * 3600));
          minsLeft = Math.floor((remainingMs % (1000 * 3600)) / (1000 * 60));
        }
      }

      if (canClaim) {
        const bonusAmount = 50;
        const nowIso = now.toISOString();
        db.transaction(() => {
          db.prepare('UPDATE users SET coin_balance = coin_balance + ?, last_daily_bonus_at = ?, streak_days = streak_days + 1 WHERE id = ?').run(
            bonusAmount,
            nowIso,
            user.id
          );
          db.prepare('INSERT INTO transactions (user_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(
            user.id,
            'kirim',
            bonusAmount,
            'Kunlik bonus',
            nowIso
          );
        })();

        const newBalance = user.coin_balance + bonusAmount;
        const bonusMsg = `🎁 <b>Kunlik bonus qo‘lga kiritildi!</b>\n\n➕ <b>50 🪙 tanga</b> hisobingizga qo‘shildi.\n🪙 <b>Jami:</b> ${newBalance.toLocaleString('ru-RU')} tanga\n\n⏰ Keyingi bonus 24 soatdan so‘ng ochiladi — ertaga ham kirishni unutmang!`;

        await ctx.reply(bonusMsg, {
          parse_mode: 'HTML',
          ...getWebAppButton('🚀 Mini Appni Ochish'),
        });
      } else {
        await ctx.reply(
          `⏳ <b>Siz bugungi kunlik bonusni olib bo‘lgansiz!</b>\n\nKeyingi bonusgacha: <b>${hoursLeft} soat ${minsLeft} daqiqa</b> qoldi.\nErtaga kutamiz! 😊`,
          {
            parse_mode: 'HTML',
            ...getWebAppButton('🚀 Mini Appni Ochish'),
          }
        );
      }
    } catch (err) {
      console.error('Error on daily bonus:', err);
    }
  });

  // 🤝 Do'st taklif qilish (with photo banner & rich caption)
  bot.hears('🤝 Do‘st taklif qilish', async (ctx) => {
    if (!(await ensureSubscribed(ctx))) return;

    try {
      const tgIdStr = ctx.from?.id.toString();
      if (!tgIdStr) return;

      const refCount = (
        db.prepare('SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?').get(tgIdStr) as { c: number }
      ).c;

      const link = `https://t.me/tdau_kitobxonlik_bot?start=r_${tgIdStr}`;
      const msg = `🤝 <b>Do‘stlaringizni taklif qiling va katta tangalar ishlang!</b>\n\n` +
        `🪙 Har bir taklif qilingan do‘st uchun sizga <b>+50 🪙 tanga</b> taqdim etiladi!\n` +
        `🏆 5 ta do‘st taklif qilib <b>Haftalik Kindle Tanlovi</b> da ishtirok eting!\n\n` +
        `👥 <b>Taklif qilgan do‘stlaringiz soni:</b> ${refCount} ta\n\n` +
        `🔗 <b>Sizning shaxsiy referal havolangiz:</b>\n<code>${link}</code>\n\n` +
        `<i>Do‘stlaringizga yuborish uchun pastdagi tugmani bosing:</i> 👇`;

      const shareText = `🏛️ Salom! Men TDAU KITOBXONLIK AKADEMIYASI da haqiqiy kitoblarni mutolaa qilib, testlar topshiryapman va sovrinlar yutyapman.\n\nSiz ham ushbu havola orqali botga qo‘shiling:\n${link}`;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareText)}`;

      const replyMarkup = Markup.inlineKeyboard([
        [Markup.button.url('🚀 Do‘stlarga ulashish', shareUrl)],
        [Markup.button.webApp('🏆 Tanlov Holatini Ko‘rish', config.webAppUrl)],
      ]);

      if (fs.existsSync(BANNER_IMAGE_PATH)) {
        await ctx.replyWithPhoto({ source: BANNER_IMAGE_PATH }, {
          caption: msg,
          parse_mode: 'HTML',
          ...replyMarkup,
        });
      } else {
        await ctx.reply(msg, {
          parse_mode: 'HTML',
          ...replyMarkup,
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // 🏆 Reyting
  bot.hears('🏆 Reyting', async (ctx) => {
    if (!(await ensureSubscribed(ctx))) return;

    try {
      const topUsers = db
        .prepare(`
          SELECT full_name, username, coin_balance,
            (SELECT COUNT(DISTINCT book_id) FROM reading_sessions WHERE user_id = users.id) as books_count
          FROM users
          ORDER BY coin_balance DESC
          LIMIT 10
        `)
        .all() as any[];

      let text = `🏆 <b>TDAU KITOBXONLIK — Peshqadamlar Reytingi (Top 10):</b>\n\n`;
      topUsers.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const rankLabel = (u.coin_balance >= 1000 || u.books_count >= 3) ? 'Ustoz 🧑‍🏫' : 'Talaba 🎓';
        text += `${medal} <b>${escapeHtml(u.full_name)}</b> (${rankLabel}) — 🪙 ${u.coin_balance?.toLocaleString()} tanga (${u.books_count || 0} kitob)\n`;
      });
      text += `\nTestlar topshiring va peshqadamlar safiga qo‘shiling! 🚀`;

      await ctx.reply(text, {
        parse_mode: 'HTML',
        ...getWebAppButton('🏆 To‘liq Reytingni Ko‘rish'),
      });
    } catch (err) {
      console.error(err);
    }
  });

  // 🎟️ Haftalik tanlov
  bot.hears('🎟️ Haftalik tanlov', async (ctx) => {
    if (!(await ensureSubscribed(ctx))) return;

    const text = `🎟️ <b>Haftalik Do‘stlar Tanlovi</b>\n\n🎁 <b>Bosh sovrin:</b> Kindle Paperwhite elektron kitobi + 3000 tanga\n🎯 <b>Shart:</b> 5 ta do‘st taklif qilish\n⏳ <b>Qolgan vaqt:</b> 2 kun 19 soat\n\nDo‘stlaringizni taklif qiling va kafolatlangan yutuqlarga ega bo‘ling!`;
    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...getWebAppButton('🎟️ Tanlovda Qatnashish'),
    });
  });

  // 📖 Qo'llanma (Exact user text)
  bot.hears('📖 Qo‘llanma', async (ctx) => {
    const guideText = `📖 <b>Qo'llanma</b>\n\n` +
      `• 📚 <b>Kutubxona</b> — kitoblarni o'qish va kolleksiyangiz\n` +
      `• 🎯 <b>Tanlovlar</b> — haftalik tanlovlarda qatnashing va yuting\n` +
      `• 🎁 <b>Sovg'alar</b> — to'plagan tangangizni sovg'aga almashtiring\n` +
      `• 👤 <b>Sahifam</b> — profilingiz, tangangiz va yutuqlaringiz\n` +
      `• 🏆 <b>Reyting</b> — eng faol kitobxonlar TOP-10\n` +
      `• 🤝 <b>Do'st taklif qilish</b> — havolangiz orqali do'st qo'shilsa ikkalangiz ham tanga olasiz\n\n` +
      `<b>Tanga qanday to'planadi?</b>\n` +
      `— Testlardan o'tish\n` +
      `— Do'stlarni taklif qilish\n` +
      `— Kitoblarni pdf variantini oʻqish orqali\n\n` +
      `Savol bo'lsa, adminga yozing.\n` +
      `👉 @tdau_admin`;

    await ctx.reply(guideText, {
      parse_mode: 'HTML',
      ...getWebAppButton('🚀 Akademiyani Boshlash'),
    });
  });

  // 📚 Kutubxona / 🎯 Tanlovlar va Testlar / 🎁 Sovg'alar
  bot.hears(['📚 Kutubxona', '🎯 Tanlovlar va Testlar', '🎁 Sovg‘alar'], async (ctx) => {
    if (!(await ensureSubscribed(ctx))) return;

    await ctx.reply(`🏛️ <b>TDAU Kitobxonlik Akademiyasi</b>:\n\nKitoblar javoni, testlar va sovg‘alar bozoriga kirish uchun pastdagi tugmani bosing:`, {
      parse_mode: 'HTML',
      ...getWebAppButton('🚀 Mini Appni Ochish'),
    });
  });

  // Default fallback
  bot.on('text', async (ctx) => {
    if (!(await ensureSubscribed(ctx))) return;

    await ctx.reply(`🏛️ <b>TDAU Kitobxonlik Akademiyasi</b> xizmatidan foydalanish uchun quyidagi tugmani bosing:`, {
      parse_mode: 'HTML',
      ...getWebAppButton('🚀 Mini Appni Ochish'),
    });
  });
}
