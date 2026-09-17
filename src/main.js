#!/usr/bin/env node
const { startScheduler, stopScheduler, runCycle } = require('./scheduler');
const { initBot } = require('./telegram');
const { loadSettings } = require('./scraper');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('========================================');
  console.log('  بوت وظائف القناة — الجزائر v2');
  console.log('========================================\n');

  // ensure data + assets dirs
  const dataDir = path.join(__dirname, '../data');
  const assetsDir = path.join(__dirname, '../assets');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const settings = loadSettings();
  console.log(`القناة: ${settings.channelId}`);
  console.log(`الجدولة: ${settings.scrapeInterval}`);
  console.log(`المواقع: ${(settings.enabledSites || []).join(', ')}`);
  console.log(`كلمات البحث: ${(settings.keywords || []).slice(0, 6).join(', ')}...\n`);

  initBot(
    async () => await runCycle(),
    () => stopScheduler()
  );

  startScheduler();

  if (process.argv.includes('--once')) {
    console.log('وضع --once: تشغيل مرة واحدة...');
    const r = await runCycle();
    console.log(r.message);
  }

  console.log('✅ النظام يعمل. Ctrl+C للإيقاف.\n');

  process.on('SIGINT', () => {
    stopScheduler();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
