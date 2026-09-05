import { Telegraf } from 'telegraf';
import { config } from './config/env.js';

const bot = new Telegraf(config.botToken);

async function setMenu() {
  try {
    console.log('Resetting default Telegram Chat Menu Button to standard default...');
    const res = await bot.telegram.setChatMenuButton({
      menuButton: {
        type: 'default',
      },
    });
    console.log('✅ Default menu button reset to default:', res);
  } catch (err: any) {
    console.error('❌ Error setting menu button:', err.message);
  }
}

setMenu();
