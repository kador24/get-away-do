function filterByKeywords(jobs, keywords = []) {
  if (!keywords || keywords.length === 0) {
    return jobs.map(j => ({ ...j, keywords: [] }));
  }
  const kws = keywords.map(k => k.toLowerCase().trim()).filter(Boolean);
  return jobs
    .map(job => {
      const t = (job.title || '').toLowerCase();
      const matched = kws.filter(k => t.includes(k));
      if (matched.length > 0) return { ...job, keywords: matched };
      return null;
    })
    .filter(Boolean);
}

function removeDuplicates(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = `${(j.title || '').toLowerCase()}|${j.link || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterJobs(jobs, keywords) {
  return removeDuplicates(filterByKeywords(jobs, keywords));
}

module.exports = { filterJobs, filterByKeywords, removeDuplicates };
