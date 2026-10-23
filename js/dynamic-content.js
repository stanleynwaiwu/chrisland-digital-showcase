/* ============================================================
   JS/DYNAMIC-CONTENT.JS
   Phase 14 — pure, DOM-free helpers shared by the two dynamic
   scenes (Latest News / Latest Updates) and by js/app.js.

   These mirror the server's rules in backend/lib/eligibility.js
   and backend/lib/durations.js so the display can keep dates
   correct on its own between (and in spite of failed) backend
   refreshes:

     - "Today" is the calendar date in Africa/Lagos, never the
       browser's or the server's local/UTC date.
     - An item is eligible when startDate <= today <= endDate
       (both inclusive — an item stays eligible through the end
       of its endDate, Lagos time). The backend only ever sends
       published items; this module re-checks the DATE window so
       an item expires at Lagos midnight even if the backend can
       no longer be reached.
     - Each item owns its slide duration; a section's duration is
       the sum of its eligible items' durations.
   ============================================================ */

export const UNIVERSITY_TIME_ZONE = 'Africa/Lagos';

// Must match backend/lib/durations.js.
export const DEFAULT_ITEM_DURATION_MS = 10000;
export const MIN_ITEM_DURATION_MS = 3000;
export const MAX_ITEM_DURATION_MS = 60000;

const lagosDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: UNIVERSITY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * @param {Date} [now] injectable for tests
 * @returns {string} 'YYYY-MM-DD' calendar date in Africa/Lagos
 */
export function lagosToday(now = new Date()) {
  return lagosDateFormat.format(now);
}

/**
 * Milliseconds from `now` until the next midnight in Africa/Lagos.
 * Africa/Lagos is a fixed UTC+1 zone with no daylight saving, so
 * Lagos midnight is always 23:00 UTC.
 * @param {Date} [now]
 * @returns {number} always > 0
 */
export function msUntilNextLagosMidnight(now = new Date()) {
  const [year, month, day] = lagosToday(now).split('-').map(Number);
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1) - 60 * 60 * 1000;
  return nextMidnightUtc - now.getTime();
}

/**
 * @param {{startDate?: string, endDate?: string}} item
 * @param {string} today 'YYYY-MM-DD' (Lagos)
 * @returns {boolean}
 */
export function isEligibleOn(item, today) {
  return (
    Boolean(item) &&
    typeof item.startDate === 'string' &&
    typeof item.endDate === 'string' &&
    item.startDate <= today &&
    today <= item.endDate
  );
}

/**
 * The item's slide duration, falling back to the default for a
 * missing or out-of-range value (e.g. a payload from an older
 * backend that has no durationMs yet).
 * @param {{durationMs?: number}} item
 * @returns {number}
 */
export function itemDurationMs(item) {
  const value = item?.durationMs;
  if (
    Number.isInteger(value) &&
    value >= MIN_ITEM_DURATION_MS &&
    value <= MAX_ITEM_DURATION_MS
  ) {
    return value;
  }
  return DEFAULT_ITEM_DURATION_MS;
}

/**
 * Items eligible today, in the backend's order, each with a
 * normalised `durationMs`.
 * @template T
 * @param {T[]} items
 * @param {string} [today]
 * @returns {Array<T & {durationMs: number}>}
 */
export function getEligibleItems(items, today = lagosToday()) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => isEligibleOn(item, today))
    .map((item) => ({ ...item, durationMs: itemDurationMs(item) }));
}

/** @param {Array<{durationMs:number}>} items */
export function sumDurations(items) {
  return items.reduce((total, item) => total + item.durationMs, 0);
}
