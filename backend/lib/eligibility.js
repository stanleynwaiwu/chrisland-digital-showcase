/**
 * Phase 14 — the ONE definition of "which updates/news are on screen
 * today", shared by the public payload (routes/presentation.js), the
 * admin's calculated section totals (routes/scenes.js) and the
 * scheduling validation in routes/updates.js / routes/news.js. Because
 * every consumer calls these same functions, the live presentation and
 * the Presentation Manager's totals cannot disagree.
 *
 * Calendar rules (documented, per the Phase 14 brief):
 *   - "Today" is the calendar date in the university's time zone,
 *     Africa/Lagos (WAT, UTC+1, no DST) — NOT the server's UTC date.
 *     Between 00:00 and 01:00 WAT the UTC date is still "yesterday",
 *     which is the bug this replaces.
 *   - start_date and end_date are INCLUSIVE: an item is eligible from
 *     the first moment of start_date through 23:59:59 (Lagos) of
 *     end_date.
 *   - Eligible = status 'published' AND start_date <= today <= end_date.
 *     news.published_at is informational only and never consulted.
 */
const db = require('../db/database');

const UNIVERSITY_TIME_ZONE = 'Africa/Lagos';

const lagosDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: UNIVERSITY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * @param {Date} [now] injectable for tests
 * @returns {string} 'YYYY-MM-DD' in Africa/Lagos
 */
function lagosToday(now = new Date()) {
  return lagosDateFormat.format(now);
}

/** @returns {Array<object>} eligible updates, priority-then-newest order (unchanged from Phase 8) */
function getEligibleUpdates(today = lagosToday()) {
  return db
    .prepare(
      `SELECT id, title, summary, image, media_type AS mediaType, media_fit AS mediaFit,
              media_layout AS mediaLayout, priority, duration_ms AS durationMs,
              start_date AS startDate, end_date AS endDate
       FROM updates
       WHERE status = 'published' AND start_date <= ? AND end_date >= ?
       ORDER BY
         CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
         start_date DESC, id ASC`
    )
    .all(today, today);
}

/** @returns {Array<object>} eligible news, newest first (unchanged from Phase 8) */
function getEligibleNews(today = lagosToday()) {
  return db
    .prepare(
      `SELECT id, title, summary, content, image, media_type AS mediaType, media_fit AS mediaFit,
              media_layout AS mediaLayout, category, duration_ms AS durationMs,
              start_date AS startDate, end_date AS endDate, published_at AS publishedAt
       FROM news
       WHERE status = 'published' AND start_date <= ? AND end_date >= ?
       ORDER BY start_date DESC, id ASC`
    )
    .all(today, today);
}

/** @param {Array<{durationMs:number}>} items */
function sumDurations(items) {
  return items.reduce((total, item) => total + item.durationMs, 0);
}

/**
 * Calculated totals for the two dynamic sections, keyed by scene id.
 * An empty section reports itemCount 0 / totalDurationMs 0 — callers
 * must treat that as "no eligible items", never as a real duration.
 */
function getDynamicSectionTotals(today = lagosToday()) {
  const updates = getEligibleUpdates(today);
  const news = getEligibleNews(today);
  return {
    'latest-updates': { itemCount: updates.length, totalDurationMs: sumDurations(updates) },
    'latest-news': { itemCount: news.length, totalDurationMs: sumDurations(news) },
  };
}

module.exports = {
  UNIVERSITY_TIME_ZONE,
  lagosToday,
  getEligibleUpdates,
  getEligibleNews,
  getDynamicSectionTotals,
};
