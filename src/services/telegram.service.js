const TelegramBot = require('node-telegram-bot-api');
const logger      = require('../utils/logger');

let bot = null;

const handleStart = async (msg) => {
  const chatId   = msg.chat.id;
  const username = msg.from?.username || null;

  if (!username) {
    if (bot) await bot.sendMessage(chatId, 'Please set a Telegram username in your settings first, then send /start again.');
    return;
  }

  try {
    const Student = require('../models/Student');
    const student = await Student.findOne({ telegramUsername: { $regex: new RegExp(`^${username}$`, 'i') } });

    if (student) {
      student.chatId            = String(chatId);
      student.telegramConnected = true;
      student.connectedAt       = new Date();
      await student.save();
      if (bot) await bot.sendMessage(chatId, `Assalamu Alaikum ${student.fullName}! ✅ You have been successfully connected to the QuranClass system. JazakAllahu Khairan.`);
      logger.info(`Telegram connected: @${username} (chat_id: ${chatId})`);
    } else {
      if (bot) await bot.sendMessage(chatId, `Assalamu Alaikum! ❌ Your Telegram username (@${username}) is not registered. Please contact your administrator.`);
      logger.warn(`Telegram /start from unregistered: @${username}`);
    }
  } catch (err) {
    logger.error('Telegram /start error:', err.message);
  }
};

const initBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram features disabled'); return null; }

  if (process.env.NODE_ENV === 'production') {
    bot = new TelegramBot(token);
    logger.info('Telegram bot initialized (webhook mode)');
  } else {
    bot = new TelegramBot(token, { polling: true });
    bot.onText(/\/start/, handleStart);
    bot.on('polling_error', (err) => logger.error('Telegram polling error:', err.message));
    logger.info('Telegram bot initialized (polling mode)');
  }
  return bot;
};

const getBot = () => bot;
module.exports = { initBot, getBot };
