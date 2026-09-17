const cron = require('node-cron');
const { scrapeAll, loadSettings } = require('./scraper');
const { filterJobs } = require('./filter');
const { getNewJobs, markAsSent } = require('./store');
const { postJobToChannel, notifyAdmin } = require('./telegram');
const { formatSummary } = require('./formatter');

let task = null;
let isRunning = false;

async function runCycle() {
  if (isRunning) {
    console.log('[Scheduler] Already running, skip');
    return { message: '⏳ عملية جارية بالفعل.', count: 0 };
  }

  isRunning = true;
  console.log('[Scheduler] === Cycle start ===');

  try {
    const settings = loadSettings();
    const raw = await scrapeAll(settings);
    const filtered = filterJobs(raw, settings.keywords || []);
    const fresh = getNewJobs(filtered);

    console.log(`[Scheduler] raw=${raw.length} filtered=${filtered.length} new=${fresh.length}`);

    const max = settings.maxJobsPerRun || 15;
    const toPost = fresh.slice(0, max);

    let posted = 0;
    for (let i = 0; i < toPost.length; i++) {
      const ok = await postJobToChannel(toPost[i], i + 1, toPost.length);
      if (ok) posted++;
      // تأخير بسيط بين المنشورات
      await new Promise(r => setTimeout(r, 1500));
    }

    if (posted > 0) {
      markAsSent(toPost.slice(0, posted));
      await notifyAdmin(formatSummary(posted));
    } else {
      await notifyAdmin('ℹ️ لم يُعثر على وظائف جديدة هذه الجولة.');
    }

    return {
      message: posted > 0
        ? `✅ تم نشر ${posted} وظيفة جديدة في القناة.`
        : 'ℹ️ لا توجد وظائف جديدة حالياً.',
      count: posted
    };
  } catch (err) {
    console.error('[Scheduler] error:', err.message);
    await notifyAdmin(`❌ خطأ في الكشط: ${err.message}`);
    return { message: `❌ خطأ: ${err.message}`, count: 0 };
  } finally {
    isRunning = false;
    console.log('[Scheduler] === Cycle end ===');
  }
}

function startScheduler() {
  const settings = loadSettings();
  const expr = settings.scrapeInterval || '0 */4 * * *';

  if (task) {
    console.log('[Scheduler] Already scheduled');
    return;
  }

  if (!cron.validate(expr)) {
    console.error('[Scheduler] Invalid cron:', expr);
    return;
  }

  task = cron.schedule(expr, async () => {
    console.log('[Scheduler] Cron triggered');
    await runCycle();
  }, { timezone: 'Africa/Algiers' });

  console.log(`[Scheduler] Scheduled: ${expr} (Algeria time)`);
}

function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    console.log('[Scheduler] Stopped');
  }
}

module.exports = { startScheduler, stopScheduler, runCycle };
