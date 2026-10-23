/**
 * Phase 14 — per-item slide duration rules, shared by lib/updates.js,
 * lib/news.js and both routes so the default and the bounds are
 * defined in exactly one place.
 *
 * Each update / news item owns how long its own slide stays on screen.
 * A dynamic section's total duration is the sum of its eligible items'
 * durations (see lib/eligibility.js).
 *
 *   DEFAULT  10 000 ms (10 s) — applied to existing rows by the
 *            migration and to new rows when none is supplied.
 *   MIN       3 000 ms (3 s)  — shorter is unreadable on a TV.
 *   MAX      60 000 ms (60 s) — longer stalls the loop for one item.
 */
const DEFAULT_ITEM_DURATION_MS = 10000;
const MIN_ITEM_DURATION_MS = 3000;
const MAX_ITEM_DURATION_MS = 60000;

/** @returns {string|null} an error message, or null when valid */
function validateDurationMs(value) {
  if (!Number.isInteger(value)) return '"durationMs" must be a whole number of milliseconds.';
  if (value < MIN_ITEM_DURATION_MS || value > MAX_ITEM_DURATION_MS) {
    return `"durationMs" must be between ${MIN_ITEM_DURATION_MS} and ${MAX_ITEM_DURATION_MS} milliseconds.`;
  }
  return null;
}

module.exports = {
  DEFAULT_ITEM_DURATION_MS,
  MIN_ITEM_DURATION_MS,
  MAX_ITEM_DURATION_MS,
  validateDurationMs,
};
