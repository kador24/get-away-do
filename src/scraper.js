const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const SITES_PATH = path.join(__dirname, '../config/sites.json');
const SETTINGS_PATH = path.join(__dirname, '../config/settings.json');

function loadSites() {
  try {
    return JSON.parse(fs.readFileSync(SITES_PATH, 'utf8'));
  } catch (e) {
    console.error('[Scraper] sites.json error:', e.message);
    return [];
  }
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch (e) {
    console.error('[Scraper] settings.json error:', e.message);
    return {};
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function scrapeSite(site, settings) {
  const results = [];
  const ua = settings.userAgent || 'Mozilla/5.0';
  const maxJobs = 25;

  console.log(`[Scraper] → ${site.name}`);

  try {
    const res = await axios.get(site.url, {
      timeout: 18000,
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,fr;q=0.9,en;q=0.8'
      },
      maxRedirects: 5,
      validateStatus: s => s < 400
    });

    const $ = cheerio.load(res.data);
    const candidates = [
      site.jobSelector,
      'a[href*="job"]',
      'a[href*="offre"]',
      'a[href*="emploi"]',
      'h2 a', 'h3 a',
      '.job-title a', '.title a'
    ].filter(Boolean);

    let elements = $();
    for (const sel of candidates) {
      try {
        const els = $(sel);
        if (els.length > 1) {
          elements = els;
          break;
        }
      } catch (_) {}
    }

    const seen = new Set();
    elements.each((i, el) => {
      if (results.length >= maxJobs) return false;
      const $el = $(el);
      let title = ($el.text() || '').trim().replace(/\s+/g, ' ').substring(0, 200);
      let link = $el.attr('href') || '';

      if (!link) {
        const a = $el.find('a').first();
        if (a.length) {
          link = a.attr('href') || '';
          if (!title) title = (a.text() || '').trim();
        }
      }

      if (!title || title.length < 6) return;
      if (seen.has(title.toLowerCase())) return;
      seen.add(title.toLowerCase());

      if (link && !link.startsWith('http')) {
        try {
          link = new URL(link, site.baseUrl || site.url).href;
        } catch (_) {
          link = site.url;
        }
      }
      if (!link) link = site.url;

      results.push({
        title,
        link,
        source: site.name,
        sourceCode: site.code,
        date: new Date().toISOString().split('T')[0],
        scrapedAt: new Date().toISOString()
      });
    });

    console.log(`[Scraper] ${site.name}: ${results.length} jobs`);
  } catch (err) {
    console.error(`[Scraper] ${site.name} error:`, err.message);
  }

  return results;
}

async function scrapeAll(customSettings) {
  const settings = customSettings || loadSettings();
  const sites = loadSites();
  const enabled = settings.enabledSites || [];
  const delayMs = settings.delayBetweenSitesMs || 4000;

  const list = sites.filter(s => enabled.includes(s.code));
  console.log(`[Scraper] Sites: ${list.map(s => s.name).join(', ')}`);

  let all = [];
  for (let i = 0; i < list.length; i++) {
    const jobs = await scrapeSite(list[i], settings);
    all = all.concat(jobs);
    if (i < list.length - 1) await delay(delayMs);
  }

  console.log(`[Scraper] Total raw: ${all.length}`);
  return all;
}

module.exports = { scrapeAll, loadSettings, loadSites, delay };
