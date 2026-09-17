const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { loadSettings } = require('./scraper');
const { formatJobMessage, formatSummary } = require('./formatter');

let bot = null;

function initBot(onManualScrape, onStop) {
  const settings = loadSettings();
  const token = settings.telegramBotToken;

  if (!token || token.length < 20) {
    console.warn('[Telegram] Invalid token');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log('[Telegram] Bot started');

  const adminId = String(settings.adminChatId || '');

  function isAdmin(chatId) {
    return String(chatId) === adminId;
  }

  // /start or /run — كشط يدوي مرة واحدة
  bot.onText(/\/(start|run)/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(chatId)) {
      bot.sendMessage(chatId, '⛔ هذا الأمر للأدمن فقط.');
      return;
    }
    bot.sendMessage(chatId, '🔄 جاري البحث عن وظائف جديدة... انتظر قليلاً.');
    try {
      const result = await onManualScrape();
      bot.sendMessage(chatId, result.message || '✅ تم.');
    } catch (e) {
      bot.sendMessage(chatId, `❌ خطأ: ${e.message}`);
    }
  });

  bot.onText(/\/stop/, (msg) => {
    if (!isAdmin(msg.chat.id)) return;
    if (typeof onStop === 'function') onStop();
    bot.sendMessage(msg.chat.id, '🛑 تم إيقاف الجدولة.');
  });

  bot.onText(/\/status/, (msg) => {
    if (!isAdmin(msg.chat.id)) return;
    const s = loadSettings();
    bot.sendMessage(msg.chat.id,
      `📊 الحالة:\n` +
      `• القناة: ${s.channelId}\n` +
      `• الجدولة: كل 4 ساعات\n` +
      `• المواقع: ${(s.enabledSites || []).join(', ')}\n` +
      `• كلمات: ${(s.keywords || []).slice(0, 5).join(', ')}...`
    );
  });

  bot.onText(/\/help/, (msg) => {
    if (!isAdmin(msg.chat.id)) return;
    bot.sendMessage(msg.chat.id,
      `الأوامر:\n` +
      `/run — كشط يدوي مرة واحدة\n` +
      `/status — الحالة\n` +
      `/stop — إيقاف الجدولة\n` +
      `/help — المساعدة`
    );
  });

  bot.on('polling_error', (err) => {
    console.error('[Telegram] polling:', err.message);
  });

  return bot;
}

/**
 * إرسال وظيفة واحدة للقناة (مع صورة إن وُجدت)
 */
async function postJobToChannel(job, index, total) {
  if (!bot) return false;
  const settings = loadSettings();
  const channelId = settings.channelId;
  if (!channelId) {
    console.error('[Telegram] No channelId');
    return false;
  }

  const caption = formatJobMessage(job, index, total);
  const logoPath = path.join(__dirname, '..', settings.logoPath || 'assets/logo.jpg');

  try {
    if (fs.existsSync(logoPath)) {
      await bot.sendPhoto(channelId, logoPath, {
        caption,
        parse_mode: 'Markdown'
      });
    } else {
      await bot.sendMessage(channelId, caption, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
    }
    console.log(`[Telegram] Posted: ${job.title.substring(0, 50)}...`);
    return true;
  } catch (err) {
    console.error('[Telegram] post error:', err.message);
    // fallback without markdown
    try {
      await bot.sendMessage(channelId, caption.replace(/\*/g, ''), {
        disable_web_page_preview: false
      });
      return true;
    } catch (e2) {
      console.error('[Telegram] fallback failed:', e2.message);
      return false;
    }
  }
}

async function notifyAdmin(text) {
  if (!bot) return;
  const settings = loadSettings();
  if (settings.adminChatId) {
    try {
      await bot.sendMessage(settings.adminChatId, text);
    } catch (_) {}
  }
}

module.exports = { initBot, postJobToChannel, notifyAdmin };
