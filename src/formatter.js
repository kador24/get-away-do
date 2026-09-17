/**
 * تنسيق احترافي كأن شخص يقدم عروض وظائف
 */
function formatJobMessage(job, index, total) {
  const title = job.title || 'وظيفة متاحة';
  const link = job.link || '';
  const source = job.source || 'منصة توظيف';
  const date = job.date || new Date().toLocaleDateString('ar-DZ');
  const kws = (job.keywords || []).slice(0, 3).join(' · ') || 'ديبلوم / ليسانس';

  // شكل احترافي كأن شخص يعلن
  const lines = [
    `💼 *عرض وظيفة جديد*`,
    ``,
    `📌 *${escapeMarkdown(title)}*`,
    ``,
    `🏢 المصدر: ${escapeMarkdown(source)}`,
    `📅 التاريخ: ${date}`,
    `🎓 المطلوب: ${escapeMarkdown(kws)}`,
    ``,
    `🔗 [اضغط هنا للتقديم](${link})`,
    ``,
    `━━━━━━━━━━━━━━━━`,
    `✨ فرصتك المهنية تبدأ من هنا`
  ];

  return lines.join('\n');
}

function escapeMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/([_*`\[])/g, '\\$1')
    .substring(0, 300);
}

function formatSummary(count) {
  return `📢 تم نشر *${count}* وظيفة جديدة في القناة.`;
}

module.exports = { formatJobMessage, formatSummary };
