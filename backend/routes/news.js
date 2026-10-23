/**
 * GET    /api/news      — full list, all statuses (admin view)
 * POST   /api/news      — create a news item
 * PUT    /api/news/:id  — partial update of an existing news item
 * DELETE /api/news/:id  — delete a news item
 *
 * All four require authentication — mirrors routes/updates.js
 * exactly (same validation shape, same response conventions). The
 * public, read-only view of this same table is GET /api/presentation's
 * `news` field (routes/presentation.js's getActiveNews()), which
 * independently filters to status='published' and an active date
 * range — untouched by this file.
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
  getAllNews,
  getNewsById,
  newsExistsById,
  createNews,
  updateNews,
  deleteNews,
} = require('../lib/news');

const router = express.Router();

const STATUSES = ['draft', 'published'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KNOWN_FIELDS = [
  'title',
  'summary',
  'content',
  'category',
  'startDate',
  'endDate',
  'publishedAt',
  'status',
  'durationMs',
  'mediaFit',
  'mediaLayout',
];

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
 * Validates a request body against the news schema.
 * @param {object} body
 * @param {{partial: boolean}} opts partial=true allows any subset (PUT); partial=false requires title/summary/startDate/endDate (POST)
 * @returns {{errors: string[], fields: object}}
 */
function validateNewsInput(body, { partial, existing = null, today = lagosToday() }) {
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

  // title — required (NOT NULL in schema)
  if (has('title')) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      errors.push('"title" must be a non-empty string.');
    } else {
      fields.title = body.title;
    }
  } else if (!partial) {
    errors.push('"title" is required.');
  }

  // summary — required (NOT NULL in schema)
  if (has('summary')) {
    if (typeof body.summary !== 'string' || body.summary.trim() === '') {
      errors.push('"summary" must be a non-empty string.');
    } else {
      fields.summary = body.summary;
    }
  } else if (!partial) {
    errors.push('"summary" is required.');
  }

  // startDate / endDate — required (NOT NULL in schema)
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

  // content — optional, nullable string
  if (has('content')) {
    if (body.content !== null && typeof body.content !== 'string') {
      errors.push('"content" must be a string or null.');
    } else {
      fields.content = body.content;
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

  // category — optional, nullable string
  if (has('category')) {
    if (body.category !== null && typeof body.category !== 'string') {
      errors.push('"category" must be a string or null.');
    } else {
      fields.category = body.category;
    }
  }

  // publishedAt — optional, nullable date string
  if (has('publishedAt')) {
    if (body.publishedAt !== null && !isValidDateString(body.publishedAt)) {
      errors.push('"publishedAt" must be null or a valid date string in YYYY-MM-DD format.');
    } else {
      fields.publishedAt = body.publishedAt;
    }
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

  // content/category/publishedAt default to null on create when omitted; a new record never has media until it is uploaded
  if (!partial) {
    if (!has('content')) fields.content = null;
    fields.image = null;
    if (!has('category')) fields.category = null;
    if (!has('publishedAt')) fields.publishedAt = null;
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
    res.json({ news: getAllNews() });
  } catch (err) {
    console.error('[GET /api/news] failed:', err);
    res.status(500).json({ error: 'Failed to load news.' });
  }
});

router.post('/', (req, res) => {
  const { errors, fields } = validateNewsInput(req.body, { partial: false });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    const id = createNews(fields);
    res.status(201).json({ news: getNewsById(id) });
  } catch (err) {
    console.error('[POST /api/news] failed:', err);
    res.status(500).json({ error: 'Failed to create news item.' });
  }
});

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid news id.' });
  }
  if (!newsExistsById(id)) {
    return res.status(404).json({ error: `News item ${id} not found.` });
  }

  const { errors, fields } = validateNewsInput(req.body, { partial: true, existing: getNewsById(id) });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    updateNews(id, fields);
    res.json({ news: getNewsById(id) });
  } catch (err) {
    console.error('[PUT /api/news/:id] failed:', err);
    res.status(500).json({ error: 'Failed to save news item.' });
  }
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid news id.' });
  }
  if (!newsExistsById(id)) {
    return res.status(404).json({ error: `News item ${id} not found.` });
  }

  try {
    const existing = getNewsById(id);
    deleteNews(id);
    if (existing?.image) deleteMediaFile(existing.image); // the record is gone; so is its file
    res.status(200).json({ deleted: id });
  } catch (err) {
    console.error('[DELETE /api/news/:id] failed:', err);
    res.status(500).json({ error: 'Failed to delete news item.' });
  }
});

// Phase 15: PUT/DELETE /api/news/:id/media (auth already applied above).
attachMediaRoutes(router, {
  owner: 'news',
  getById: getNewsById,
  update: updateNews,
  respond: (id) => ({ news: getNewsById(id) }),
  parseId,
});

module.exports = router;
