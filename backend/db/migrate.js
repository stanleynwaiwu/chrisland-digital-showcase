/**
 * One-time (idempotent) database setup:
 *   1. Applies schema.sql (CREATE TABLE IF NOT EXISTS — safe to
 *      run repeatedly).
 *   2. Seeds scene_config with the 10 scenes already registered in
 *      js/app.js, in their current order, all enabled — so the
 *      admin's Scene Manager starts truthfully reflecting what the
 *      presentation already does, not a blank slate.
 *   3. Seeds settings with the values currently hardcoded in
 *      scenes/contact.js and data/settings.json, for the same
 *      reason.
 *   4. Adapts data/announcements.json into the `updates` table —
 *      each existing announcement becomes a published update with
 *      no title (matching its original shape), preserving its
 *      current live behaviour rather than starting empty.
 *
 * Safe to re-run: every insert is guarded so existing rows are
 * never duplicated or overwritten.
 */
const fs = require('fs');
const path = require('path');
const db = require('./database');
const { DEFAULT_ITEM_DURATION_MS } = require('../lib/durations');

/**
 * node:sqlite's DatabaseSync has no db.transaction(fn) convenience
 * wrapper the way better-sqlite3 did, so this does the same job
 * explicitly: BEGIN, run fn(), COMMIT — or ROLLBACK and re-throw if
 * fn() fails, so a failed seed never leaves a half-written table.
 * @param {() => void} fn
 */
function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function applySchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('[migrate] schema applied');
}

// Matches js/app.js's current registration order exactly.
const EXISTING_SCENES = [
  'opening-logo',
  'welcome-scene',
  'vision-mission-values',
  'campus-experience',
  'academic-programmes',
  'student-life',
  'research-innovation',
  'graduate-success',
  'admissions',
  'contact',
];

function seedSceneConfig() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO scene_config (id, enabled, sort_order)
    VALUES (?, 1, ?)
  `);
  withTransaction(() => {
    EXISTING_SCENES.forEach((id, index) => insert.run(id, index));
  });
  console.log(`[migrate] scene_config seeded (${EXISTING_SCENES.length} scenes)`);
}

// Phase 11 — the two new database-backed presentation scenes
// (js/app.js only registers each against the SceneEngine when its
// row here has enabled=1). Seeded INSERT OR IGNORE, appended after
// the existing 10 scenes, explicitly disabled — so installing
// Phase 11 never changes what the presentation actually shows until
// an administrator turns one on via the existing Scene Configuration
// API. No schema change was needed: scene_config already accepts
// any scene id with an enabled flag.
const DYNAMIC_SCENES = ['latest-updates', 'latest-news'];

function seedDynamicSceneConfig() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO scene_config (id, enabled, sort_order)
    VALUES (?, 0, ?)
  `);
  withTransaction(() => {
    DYNAMIC_SCENES.forEach((id, index) => insert.run(id, EXISTING_SCENES.length + index));
  });
  console.log(`[migrate] dynamic scene_config seeded, disabled by default (${DYNAMIC_SCENES.length} scenes)`);
}

// Phase 14 — per-item slide duration. schema.sql's CREATE TABLE IF NOT
// EXISTS only covers fresh databases, so an existing database needs an
// explicit, additive ALTER. Guarded by PRAGMA table_info so re-running
// migrate is a no-op, and existing rows receive the column DEFAULT
// (10000 ms) — no row, id, or other column is touched.
function ensureDurationColumns() {
  ['updates', 'news'].forEach((table) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (cols.some((c) => c.name === 'duration_ms')) {
      console.log(`[migrate] ${table}.duration_ms already present — skipping`);
      return;
    }
    db.exec(`ALTER TABLE ${table} ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT ${DEFAULT_ITEM_DURATION_MS}`);
    console.log(`[migrate] added ${table}.duration_ms (default ${DEFAULT_ITEM_DURATION_MS} ms)`);
  });
}

// Phase 15: media metadata for News and Updates. Additive ALTERs, each
// guarded by PRAGMA table_info so re-running migrate is a no-op. Existing
// rows keep every value; they receive NULL / the column DEFAULTs, so an
// existing text-only item is unchanged.
const MEDIA_COLUMNS = [
  ['media_type', "TEXT CHECK (media_type IN ('image', 'video'))"],
  ['media_fit', "TEXT NOT NULL DEFAULT 'cover' CHECK (media_fit IN ('cover', 'contain'))"],
  ['media_layout', "TEXT NOT NULL DEFAULT 'split' CHECK (media_layout IN ('split', 'full'))"],
];

function ensureMediaColumns() {
  ['updates', 'news'].forEach((table) => {
    const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    MEDIA_COLUMNS.forEach(([name, definition]) => {
      if (existing.has(name)) {
        console.log(`[migrate] ${table}.${name} already present — skipping`);
        return;
      }
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      console.log(`[migrate] added ${table}.${name}`);
    });
  });
}

const DEFAULT_SETTINGS = {
  'contact.website': 'www.chrislanduniversity.edu.ng',
  'contact.admissionsEmail': 'admissions@chrisland.edu.ng',
  'contact.generalEmail': 'info@chrisland.edu.ng',
  'contact.telephone': '+234 XXX XXX XXXX',
  'contact.address': 'Chrisland University, Abeokuta, Ogun State, Nigeria',
  'social.facebook': '@ChrislandUniversity',
  'social.instagram': '@chrislanduniversity',
  'social.linkedin': 'Chrisland University',
  'social.youtube': 'Chrisland University',
  'presentation.autoPlay': 'true',
  'presentation.loop': 'true',
  'presentation.defaultDurationMs': '12000',
  'presentation.transitionDurationMs': '1000',
};

function seedSettings() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  withTransaction(() => {
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => insert.run(key, value));
  });
  console.log(`[migrate] settings seeded (${Object.keys(DEFAULT_SETTINGS).length} keys)`);
}

function seedUpdatesFromAnnouncements() {
  const announcementsPath = path.join(__dirname, '..', '..', 'data', 'announcements.json');
  if (!fs.existsSync(announcementsPath)) {
    console.log('[migrate] data/announcements.json not found — skipping updates seed');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(announcementsPath, 'utf8'));
  } catch (err) {
    console.warn('[migrate] could not parse data/announcements.json — skipping updates seed:', err.message);
    return;
  }

  const announcements = Array.isArray(parsed.announcements) ? parsed.announcements : [];
  if (announcements.length === 0) return;

  // Skip entirely if updates already has rows — this seed only
  // ever runs against a genuinely empty table, so re-running
  // migrate never duplicates or clobbers admin-edited content.
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM updates').get();
  if (count > 0) {
    console.log('[migrate] updates table already has rows — skipping announcements seed');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO updates (title, summary, priority, start_date, end_date, status)
    VALUES (NULL, ?, ?, ?, ?, 'published')
  `);
  withTransaction(() => {
    announcements.forEach((a) => {
      const priority = ['low', 'normal', 'high'].includes(a.priority) ? a.priority : 'normal';
      insert.run(a.message, priority, a.startDate, a.endDate);
    });
  });
  console.log(`[migrate] updates seeded from announcements.json (${announcements.length} rows)`);
}

// Phase 16: scene_content is created by schema.sql (CREATE TABLE IF NOT EXISTS),
// which is purely additive. Report whether it was already there.
function reportSceneContentTable(existedBefore) {
  console.log(
    existedBefore
      ? '[migrate] scene_content already present — skipping'
      : '[migrate] created scene_content (Phase 16 scene content overrides)'
  );
}

const sceneContentExisted = Boolean(
  db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='scene_content'").get()
);
applySchema();
reportSceneContentTable(sceneContentExisted);
ensureDurationColumns();
ensureMediaColumns();
seedSceneConfig();
seedDynamicSceneConfig();
seedSettings();
seedUpdatesFromAnnouncements();

console.log('[migrate] done');
