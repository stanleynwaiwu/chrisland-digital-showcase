/**
 * GET /api/presentation
 *
 * Returns everything the live display needs in a single response,
 * per the "consolidated payload rather than many small requests"
 * requirement. The presentation fetches this once at boot with a
 * short timeout and falls back to cached/local data if it fails —
 * see js/app.js (a later phase) for that logic.
 *
 * "Active" for updates/news is defined once, in lib/eligibility.js:
 * status = 'published' AND today (Africa/Lagos calendar date) falls
 * within [start_date, end_date] inclusive. `dynamicSections` carries
 * the calculated per-section totals (sum of eligible item durations).
 */
const express = require('express');
const { getSettingsNested } = require('../lib/settings');
const { getSceneConfigList } = require('../lib/scenes');
const { getPublicSceneContent } = require('../lib/scene-content');
const {
  UNIVERSITY_TIME_ZONE,
  lagosToday,
  getEligibleUpdates,
  getEligibleNews,
  getDynamicSectionTotals,
} = require('../lib/eligibility');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const today = lagosToday();
    const payload = {
      version: 1,
      generatedAt: new Date().toISOString(),
      scenes: getSceneConfigList(),
      today,
      timeZone: UNIVERSITY_TIME_ZONE,
      updates: getEligibleUpdates(today),
      news: getEligibleNews(today),
      dynamicSections: getDynamicSectionTotals(today),
      // Phase 16: stored edits to the ten original scenes ({} when none / not migrated).
      sceneContent: getPublicSceneContent(),
      settings: getSettingsNested(),
    };
    res.json(payload);
  } catch (err) {
    console.error('[GET /api/presentation] failed:', err);
    // The display's own fallback logic handles a non-200 response —
    // this endpoint never throws an unhandled error to the client.
    res.status(500).json({ error: 'Failed to build presentation payload.' });
  }
});

module.exports = router;
