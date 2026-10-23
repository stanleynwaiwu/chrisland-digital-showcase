/**
 * Shared `updates` table helpers — used by routes/presentation.js
 * (read-only, filtered to published+in-range, for the public
 * payload) and routes/updates.js (full read/write CRUD, for the
 * admin panel). Same extraction pattern as lib/settings.js and
 * lib/scenes.js.
 *
 * Schema (backend/db/schema.sql):
 *   id          INTEGER PRIMARY KEY AUTOINCREMENT
 *   title       TEXT              (nullable)
 *   summary     TEXT NOT NULL
 *   image       TEXT              (nullable; Phase 15: generated media path, written only by lib/media.js endpoints)
 *   media_type / media_fit / media_layout   (Phase 15 media metadata)
 *   priority    TEXT NOT NULL DEFAULT 'normal'  CHECK IN ('low','normal','high')
 *   start_date  TEXT NOT NULL     ('YYYY-MM-DD')
 *   end_date    TEXT NOT NULL     ('YYYY-MM-DD')
 *   status      TEXT NOT NULL DEFAULT 'draft'   CHECK IN ('draft','published')
 *   duration_ms INTEGER NOT NULL DEFAULT 10000  (Phase 14)
 *   created_at  TEXT NOT NULL DEFAULT (datetime('now'))
 *   updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
 */
const db = require('../db/database');

const ROW_COLUMNS = `id, title, summary, image, media_type AS mediaType,
       media_fit AS mediaFit, media_layout AS mediaLayout, priority,
       start_date AS startDate, end_date AS endDate, status,
       duration_ms AS durationMs, created_at AS createdAt, updated_at AS updatedAt`;

/**
 * Full admin-facing list, every status, most relevant first:
 * published-and-current-looking items first by start date, with id
 * as a deterministic tiebreaker. (The public/presentation view uses
 * its own narrower query in routes/presentation.js — unchanged.)
 * @returns {Array<object>}
 */
function getAllUpdates() {
  return db
    .prepare(`SELECT ${ROW_COLUMNS} FROM updates ORDER BY start_date DESC, id DESC`)
    .all();
}

/** @param {number} id @returns {object|undefined} */
function getUpdateById(id) {
  return db.prepare(`SELECT ${ROW_COLUMNS} FROM updates WHERE id = ?`).get(id);
}

/** @param {number} id @returns {boolean} */
function updateExistsById(id) {
  return Boolean(db.prepare('SELECT 1 FROM updates WHERE id = ?').get(id));
}

/**
 * Inserts a new row. Caller has already validated/defaulted every
 * field — this just writes it.
 * @param {{title: string|null, summary: string, image: string|null, priority: string, startDate: string, endDate: string, status: string}} fields
 * @returns {number} the new row's id
 */
function createUpdate(fields) {
  const result = db
    .prepare(
      `INSERT INTO updates (title, summary, image, priority, start_date, end_date, status, duration_ms, media_fit, media_layout)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      fields.title,
      fields.summary,
      fields.image,
      fields.priority,
      fields.startDate,
      fields.endDate,
      fields.status,
      fields.durationMs,
      fields.mediaFit ?? 'cover',
      fields.mediaLayout ?? 'split'
    );
  return Number(result.lastInsertRowid);
}

/**
 * Updates only the columns present in `fields` (partial update),
 * same convention as lib/scenes.js's updateSceneConfig.
 * @param {number} id
 * @param {{title?: string|null, summary?: string, image?: string|null, priority?: string, startDate?: string, endDate?: string, status?: string}} fields
 * @returns {boolean} whether a row was updated
 */
function updateUpdate(id, fields) {
  const columnMap = {
    title: 'title',
    summary: 'summary',
    image: 'image',
    mediaType: 'media_type',
    mediaFit: 'media_fit',
    mediaLayout: 'media_layout',
    priority: 'priority',
    startDate: 'start_date',
    endDate: 'end_date',
    status: 'status',
    durationMs: 'duration_ms',
  };

  const sets = [];
  const params = [];

  Object.entries(columnMap).forEach(([key, column]) => {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${column} = ?`);
      params.push(fields[key]);
    }
  });

  if (sets.length === 0) return false;

  sets.push("updated_at = datetime('now')");
  params.push(id);

  const result = db.prepare(`UPDATE updates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return result.changes > 0;
}

/** @param {number} id @returns {boolean} whether a row was deleted */
function deleteUpdate(id) {
  const result = db.prepare('DELETE FROM updates WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  getAllUpdates,
  getUpdateById,
  updateExistsById,
  createUpdate,
  updateUpdate,
  deleteUpdate,
};
