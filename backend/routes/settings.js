/**
 * GET /api/settings  — full nested settings object (admin view)
 * PUT /api/settings  — upsert any subset of {contact, social, presentation}
 *
 * Both require authentication — this is the admin-facing read/write
 * surface. The public, read-only view of these same values is
 * GET /api/presentation's `settings` field (via the same
 * lib/settings.js helpers, so the two can never drift apart).
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getSettingsNested, setSettingsNested } = require('../lib/settings');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  try {
    res.json({ settings: getSettingsNested() });
  } catch (err) {
    console.error('[GET /api/settings] failed:', err);
    res.status(500).json({ error: 'Failed to load settings.' });
  }
});

router.put('/', (req, res) => {
  const { settings } = req.body || {};

  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return res.status(400).json({ error: 'Request body must include a "settings" object.' });
  }

  const ALLOWED_GROUPS = ['contact', 'social', 'presentation'];
  const invalidGroups = Object.keys(settings).filter((g) => !ALLOWED_GROUPS.includes(g));
  if (invalidGroups.length > 0) {
    return res.status(400).json({ error: `Unknown settings group(s): ${invalidGroups.join(', ')}` });
  }

  try {
    setSettingsNested(settings);
    res.json({ settings: getSettingsNested() });
  } catch (err) {
    console.error('[PUT /api/settings] failed:', err);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

module.exports = router;
