/**
 * GET    /api/updates      — full list, all statuses (admin view)
 * POST   /api/updates      — create an update
 * PUT    /api/updates/:id  — partial update of an existing update
 * DELETE /api/updates/:id  — delete an update
 *
 * All four require authentication — this is the admin-facing
 * surface. The public, read-only view of this same table is
 * GET /api/presentation's `updates` field (routes/presentation.js),
 * which independently filters to status='published' and an active
 * date range — that query is untouched by this file.
 */
const express = require('express');
const { lagosToday } = require('../lib/eligibility');
const {
  DEFAULT_ITEM_DURATION_MS,
  validateDurationMs,
} = require('../lib/durations');
const { requireAuth } = require('../middleware/auth');
const { FITS, LAYOUTS, deleteMediaFile, attachMediaRoutes } = require('../lib/media');
const {
  getAllUpdates,
  getUpdateById,
  updateExistsById,
  createUpdate,
  updateUpdate,
  deleteUpdate,
} = require('../lib/updates');

const router = express.Router();

const PRIORITIES = ['low', 'normal', 'high'];
const STATUSES = ['draft', 'published'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KNOWN_FIELDS = ['title', 'summary', 'priority', 'startDate', 'endDate', 'status', 'durationMs', 'mediaFit', 'mediaLayout'];

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

/** @returns {number|null} parsed positive integer id, or null if malformed */
function parseId(raw) {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Validates a request body against the updates schema.
 * @param {object} body
 * @param {{partial: boolean}} opts partial=true allows any subset of fields (PUT); partial=false requires summary/startDate/endDate (POST)
 * @returns {{errors: string[], fields: object}}
 */
function validateUpdateInput(body, { partial, existing = null, today = lagosToday() }) {
  const errors = [];
  const fields = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object.'], fields };
  }

  const unknown = Object.keys(body).filter((k) => !KNOWN_FIELDS.includes(k));
  if (unknown.length > 0) {
    errors.push(`Unknown field(s): ${unknown.join(', ')}`);
  }

  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  // summary — required on create, optional (but non-empty if present) on update
  if (has('summary')) {
    if (typeof body.summary !== 'string' || body.summary.trim() === '') {
      errors.push('"summary" must be a non-empty string.');
    } else {
      fields.summary = body.summary;
    }
  } else if (!partial) {
    errors.push('"summary" is required.');
  }

  // startDate / endDate — required on create, validated if present on update
  if (has('startDate')) {
    if (!isValidDateString(body.startDate)) {
      errors.push('"startDate" must be a valid date string in YYYY-MM-DD format.');
    } else {
      fields.startDate = body.startDate;
    }
  } else if (!partial) {
    errors.push('"startDate" is required.');
  }

  if (has('endDate')) {
    if (!isValidDateString(body.endDate)) {
      errors.push('"endDate" must be a valid date string in YYYY-MM-DD format.');
    } else {
      fields.endDate = body.endDate;
    }
  } else if (!partial) {
    errors.push('"endDate" is required.');
  }

  // Only compare ranges when both ends of the range are present in this request's fields.
  // Scheduling rules (Phase 14). Dates are compared as plain YYYY-MM-DD
  // strings against the Africa/Lagos calendar date.
  //  - A NEW record may not start in the past.
  //  - An edit may not MOVE startDate into the past, but re-saving a record
  //    whose (already-past) startDate is unchanged is always allowed.
  //  - endDate must not precede startDate, judged on the effective values
  //    (request value, else the stored one) so a PUT that changes only one
  //    end of the range is still checked against the other.
  if (has('startDate') && isValidDateString(body.startDate)) {
    const startChanged = !existing || body.startDate !== existing.startDate;
    if (startChanged && body.startDate < today) {
      errors.push(`"startDate" must not be in the past (today is ${today}, Africa/Lagos).`);
    }
  }
  const effectiveStart = has('startDate') ? body.startDate : existing?.startDate;
  const effectiveEnd = has('endDate') ? body.endDate : existing?.endDate;
  if (
    effectiveStart &&
    effectiveEnd &&
    isValidDateString(effectiveStart) &&
    isValidDateString(effectiveEnd) &&
    effectiveStart > effectiveEnd
  ) {
    errors.push('"startDate" must not be after "endDate".');
  }

  // title — optional, nullable string
  if (has('title')) {
    if (body.title !== null && typeof body.title !== 'string') {
      errors.push('"title" must be a string or null.');
    } else {
      fields.title = body.title;
    }
  }

  // Phase 15: `image` (the stored media path) and `mediaType` are written ONLY by
  // the upload/remove endpoints (PUT/DELETE /:id/media), never from this JSON body,
  // so a request can never point a record at an arbitrary file path. Only the
  // presentation choices are editable here.
  if (has('mediaFit')) {
    if (!FITS.includes(body.mediaFit)) {
      errors.push(`"mediaFit" must be one of: ${FITS.join(', ')}.`);
    } else {
      fields.mediaFit = body.mediaFit;
    }
  } else if (!partial) {
    fields.mediaFit = 'cover';
  }

  if (has('mediaLayout')) {
    if (!LAYOUTS.includes(body.mediaLayout)) {
      errors.push(`"mediaLayout" must be one of: ${LAYOUTS.join(', ')}.`);
    } else {
      fields.mediaLayout = body.mediaLayout;
    }
  } else if (!partial) {
    fields.mediaLayout = 'split';
  }

  // priority — optional, defaults to 'normal' on create
  if (has('priority')) {
    if (!PRIORITIES.includes(body.priority)) {
      errors.push(`"priority" must be one of: ${PRIORITIES.join(', ')}.`);
    } else {
      fields.priority = body.priority;
    }
  } else if (!partial) {
    fields.priority = 'normal';
  }

  // status — optional, defaults to 'draft' on create
  if (has('status')) {
    if (!STATUSES.includes(body.status)) {
      errors.push(`"status" must be one of: ${STATUSES.join(', ')}.`);
    } else {
      fields.status = body.status;
    }
  } else if (!partial) {
    fields.status = 'draft';
  }

  // title defaults to null on create when omitted; a new record never has media until it is uploaded
  if (!partial) {
    if (!has('title')) fields.title = null;
    fields.image = null;
  }

  // durationMs — optional (Phase 14), bounds in lib/durations.js; defaults on create
  if (has('durationMs')) {
    const durationError = validateDurationMs(body.durationMs);
    if (durationError) {
      errors.push(durationError);
    } else {
      fields.durationMs = body.durationMs;
    }
  } else if (!partial) {
    fields.durationMs = DEFAULT_ITEM_DURATION_MS;
  }

  if (partial && Object.keys(fields).length === 0 && errors.length === 0) {
    errors.push('Request body must include at least one updatable field.');
  }

  return { errors, fields };
}

router.use(requireAuth);

router.get('/', (req, res) => {
  try {
    res.json({ updates: getAllUpdates() });
  } catch (err) {
    console.error('[GET /api/updates] failed:', err);
    res.status(500).json({ error: 'Failed to load updates.' });
  }
});

router.post('/', (req, res) => {
  const { errors, fields } = validateUpdateInput(req.body, { partial: false });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    const id = createUpdate(fields);
    res.status(201).json({ update: getUpdateById(id) });
  } catch (err) {
    console.error('[POST /api/updates] failed:', err);
    res.status(500).json({ error: 'Failed to create update.' });
  }
});

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid update id.' });
  }
  if (!updateExistsById(id)) {
    return res.status(404).json({ error: `Update ${id} not found.` });
  }

  const { errors, fields } = validateUpdateInput(req.body, { partial: true, existing: getUpdateById(id) });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    updateUpdate(id, fields);
    res.json({ update: getUpdateById(id) });
  } catch (err) {
    console.error('[PUT /api/updates/:id] failed:', err);
    res.status(500).json({ error: 'Failed to save update.' });
  }
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid update id.' });
  }
  if (!updateExistsById(id)) {
    return res.status(404).json({ error: `Update ${id} not found.` });
  }

  try {
    const existing = getUpdateById(id);
    deleteUpdate(id);
    if (existing?.image) deleteMediaFile(existing.image); // the record is gone; so is its file
    res.status(200).json({ deleted: id });
  } catch (err) {
    console.error('[DELETE /api/updates/:id] failed:', err);
    res.status(500).json({ error: 'Failed to delete update.' });
  }
});

// Phase 15: PUT/DELETE /api/updates/:id/media (auth already applied above).
attachMediaRoutes(router, {
  owner: 'updates',
  getById: getUpdateById,
  update: updateUpdate,
  respond: (id) => ({ update: getUpdateById(id) }),
  parseId,
});

module.exports = router;
