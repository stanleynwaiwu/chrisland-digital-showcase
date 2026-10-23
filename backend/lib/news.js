/**
 * Shared `news` table helpers — used by routes/presentation.js
 * (read-only, filtered to published+in-range, for the public
 * payload) and routes/news.js (full read/write CRUD, for the admin
 * panel). Same extraction pattern as lib/updates.js, lib/scenes.js
 * and lib/settings.js.
 *
 * Schema (backend/db/schema.sql):
 *   id            INTEGER PRIMARY KEY AUTOINCREMENT
 *   title         TEXT NOT NULL
 *   summary       TEXT NOT NULL
 *   content       TEXT              (nullable)
 *   image         TEXT              (nullable; Phase 15: generated media path, written only by lib/media.js endpoints)
 *   media_type    TEXT              (Phase 15: 'image' | 'video' | NULL)
 *   media_fit     TEXT NOT NULL DEFAULT 'cover'  ('cover' | 'contain')
 *   media_layout  TEXT NOT NULL DEFAULT 'split'  ('split' | 'full')
 *   category      TEXT              (nullable)
 *   start_date    TEXT NOT NULL     ('YYYY-MM-DD')
 *   end_date      TEXT NOT NULL     ('YYYY-MM-DD')
 *   published_at  TEXT              (nullable)
 *   status        TEXT NOT NULL DEFAULT 'draft'  CHECK IN ('draft','published')
 *   duration_ms   INTEGER NOT NULL DEFAULT 10000 (Phase 14)
 *   created_at    TEXT NOT NULL DEFAULT (datetime('now'))
 *   updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
 */
const db = require('../db/database');

const ROW_COLUMNS = `id, title, summary, content, image, media_type AS mediaType,
       media_fit AS mediaFit, media_layout AS mediaLayout, category,
       start_date AS startDate, end_date AS endDate, published_at AS publishedAt, status,
       duration_ms AS durationMs, created_at AS createdAt, updated_at AS updatedAt`;

/**
 * Full admin-facing list, every status, most relevant first — same
 * ordering convention as lib/updates.js's getAllUpdates().
 * @returns {Array<object>}
 */
function getAllNews() {
  return db
    .prepare(`SELECT ${ROW_COLUMNS} FROM news ORDER BY start_date DESC, id DESC`)
    .all();
}

/** @param {number} id @returns {object|undefined} */
function getNewsById(id) {
  return db.prepare(`SELECT ${ROW_COLUMNS} FROM news WHERE id = ?`).get(id);
}

/** @param {number} id @returns {boolean} */
function newsExistsById(id) {
  return Boolean(db.prepare('SELECT 1 FROM news WHERE id = ?').get(id));
}

/**
 * Inserts a new row. Caller has already validated/defaulted every
 * field — this just writes it.
 * @param {{title: string, summary: string, content: string|null, image: string|null, category: string|null, startDate: string, endDate: string, publishedAt: string|null, status: string}} fields
 * @returns {number} the new row's id
 */
function createNews(fields) {
  const result = db
    .prepare(
      `INSERT INTO news (title, summary, content, image, category, start_date, end_date, published_at, status, duration_ms, media_fit, media_layout)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      fields.title,
      fields.summary,
      fields.content,
      fields.image,
      fields.category,
      fields.startDate,
      fields.endDate,
      fields.publishedAt,
      fields.status,
      fields.durationMs,
      fields.mediaFit ?? 'cover',
      fields.mediaLayout ?? 'split'
    );
  return Number(result.lastInsertRowid);
}

/**
 * Updates only the columns present in `fields` (partial update),
 * same convention as lib/updates.js's updateUpdate.
 * @param {number} id
 * @param {object} fields any subset of {title, summary, content, image, category, startDate, endDate, publishedAt, status}
 * @returns {boolean} whether a row was updated
 */
function updateNews(id, fields) {
  const columnMap = {
    title: 'title',
    summary: 'summary',
    content: 'content',
    image: 'image',
    mediaType: 'media_type',
    mediaFit: 'media_fit',
    mediaLayout: 'media_layout',
    category: 'category',
    startDate: 'start_date',
    endDate: 'end_date',
    publishedAt: 'published_at',
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

  const result = db.prepare(`UPDATE news SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return result.changes > 0;
}

/** @param {number} id @returns {boolean} whether a row was deleted */
function deleteNews(id) {
  const result = db.prepare('DELETE FROM news WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  getAllNews,
  getNewsById,
  newsExistsById,
  createNews,
  updateNews,
  deleteNews,
};
