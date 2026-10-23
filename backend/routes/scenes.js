/**
 * GET /api/scenes       — full scene_config list (admin Scene Manager view)
 * PUT /api/scenes/:id   — update one scene's enabled / sortOrder / durationOverrideMs
 *
 * Both require authentication. The public, read-only view of this
 * same data is GET /api/presentation's `scenes` field (via the same
 * lib/scenes.js helper, so the two can never drift apart).
 *
 * Scene ids are fixed by the code-defined scenes and seeded once by
 * db/migrate.js — this API never creates or deletes a scene_config
 * row, only updates the columns of an existing one. An unknown id
 * is rejected with 404 rather than silently inserted.
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getSceneConfigList, sceneExists, updateSceneConfig } = require('../lib/scenes');
const { getDynamicSectionTotals } = require('../lib/eligibility');

// Phase 14: these two scenes' duration is calculated (sum of eligible item
// durations), so a manual override is rejected rather than silently ignored.
const CALCULATED_DURATION_SCENES = ['latest-updates', 'latest-news'];

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  try {
    res.json({ scenes: getSceneConfigList(), dynamicSections: getDynamicSectionTotals() });
  } catch (err) {
    console.error('[GET /api/scenes] failed:', err);
    res.status(500).json({ error: 'Failed to load scene configuration.' });
  }
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  if (!sceneExists(id)) {
    return res.status(404).json({ error: `Unknown scene id: ${id}` });
  }

  const fields = {};
  const errors = [];

  if (Object.prototype.hasOwnProperty.call(body, 'enabled')) {
    if (typeof body.enabled !== 'boolean') {
      errors.push('"enabled" must be a boolean.');
    } else {
      fields.enabled = body.enabled;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'sortOrder')) {
    const { sortOrder } = body;
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      errors.push('"sortOrder" must be a non-negative integer.');
    } else {
      fields.sortOrder = sortOrder;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'durationOverrideMs')) {
    const { durationOverrideMs } = body;
    if (durationOverrideMs !== null && CALCULATED_DURATION_SCENES.includes(id)) {
      errors.push(`"${id}" has a calculated duration (the sum of its eligible items' durations) and cannot be given a manual override.`);
    } else if (durationOverrideMs !== null && (!Number.isInteger(durationOverrideMs) || durationOverrideMs <= 0)) {
      errors.push('"durationOverrideMs" must be null or a positive integer.');
    } else {
      fields.durationOverrideMs = durationOverrideMs;
    }
  }

  if (Object.keys(fields).length === 0 && errors.length === 0) {
    errors.push('Request body must include at least one of: enabled, sortOrder, durationOverrideMs.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    updateSceneConfig(id, fields);
    res.json({ scenes: getSceneConfigList(), dynamicSections: getDynamicSectionTotals() });
  } catch (err) {
    console.error('[PUT /api/scenes/:id] failed:', err);
    res.status(500).json({ error: 'Failed to save scene configuration.' });
  }
});

module.exports = router;
