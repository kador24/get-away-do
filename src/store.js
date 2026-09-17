const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../data/sent_jobs.json');

function loadSent() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch (_) {
    return [];
  }
}

function saveSent(list) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // keep last 2000 only
  const trimmed = list.slice(-2000);
  fs.writeFileSync(STORE_PATH, JSON.stringify(trimmed, null, 2), 'utf8');
}

function makeKey(job) {
  return `${(job.title || '').toLowerCase().trim()}|${(job.link || '').trim()}`;
}

function getNewJobs(jobs) {
  const sent = loadSent();
  const sentSet = new Set(sent);
  const fresh = jobs.filter(j => !sentSet.has(makeKey(j)));
  return fresh;
}

function markAsSent(jobs) {
  const sent = loadSent();
  const keys = jobs.map(makeKey);
  const merged = [...new Set([...sent, ...keys])];
  saveSent(merged);
}

module.exports = { getNewJobs, markAsSent, loadSent };
