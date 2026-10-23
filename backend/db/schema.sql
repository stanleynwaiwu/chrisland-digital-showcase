-- Chrisland Experience — Admin database schema (V1)
--
-- Design note: `updates` deliberately mirrors the shape already
-- established in data/announcements.json (priority, startDate,
-- endDate as the scheduling window) rather than inventing a
-- parallel model. `title` is nullable so existing announcement
-- rows (which only ever had a `message`) migrate cleanly without
-- fabricating titles.
--
-- `status` implements the Draft -> Preview -> Publish -> Live flow:
-- an item is only eligible to appear on the live presentation when
-- status = 'published' AND today's date falls within
-- [start_date, end_date] AND its scene is enabled in scene_config.
-- Draft items can still be opened in the admin preview.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scene_config (
  id                  TEXT PRIMARY KEY,   -- matches the code-defined scene id, e.g. 'welcome-scene'
  enabled             INTEGER NOT NULL DEFAULT 1,  -- 0/1
  sort_order          INTEGER NOT NULL DEFAULT 0,
  duration_override_ms INTEGER,           -- NULL = use the scene's own code-defined duration
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS updates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT,                        -- nullable — legacy announcements had no title
  summary     TEXT NOT NULL,               -- the announcement/message text
  image       TEXT,                        -- relative path under backend/uploads, nullable (Phase 15: generated name, set only by the media endpoints)
  media_type  TEXT CHECK (media_type IN ('image', 'video')),  -- Phase 15: kind of the file in `image`, NULL when none
  media_fit   TEXT NOT NULL DEFAULT 'cover' CHECK (media_fit IN ('cover', 'contain')),    -- Phase 15
  media_layout TEXT NOT NULL DEFAULT 'split' CHECK (media_layout IN ('split', 'full')),  -- Phase 15
  priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  start_date  TEXT NOT NULL,               -- 'YYYY-MM-DD'
  end_date    TEXT NOT NULL,               -- 'YYYY-MM-DD'
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  duration_ms INTEGER NOT NULL DEFAULT 10000,  -- Phase 14: how long this item's own slide stays on screen (bounds enforced in lib/durations.js)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS news (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,             -- short teaser, used in cinematic reveal
  content       TEXT,                      -- longer body, optional for V1
  image         TEXT,                      -- relative path under backend/uploads, nullable (Phase 15: generated name, set only by the media endpoints)
  media_type    TEXT CHECK (media_type IN ('image', 'video')),  -- Phase 15: kind of the file in `image`, NULL when none
  media_fit     TEXT NOT NULL DEFAULT 'cover' CHECK (media_fit IN ('cover', 'contain')),    -- Phase 15
  media_layout  TEXT NOT NULL DEFAULT 'split' CHECK (media_layout IN ('split', 'full')),  -- Phase 15
  category      TEXT,
  start_date    TEXT NOT NULL,
  end_date      TEXT NOT NULL,
  published_at  TEXT,                      -- when it was actually published, nullable while draft
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  duration_ms   INTEGER NOT NULL DEFAULT 10000,  -- Phase 14: per-item slide duration (see lib/durations.js)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  filename    TEXT NOT NULL,
  path        TEXT NOT NULL,               -- relative path under backend/uploads
  type        TEXT NOT NULL CHECK (type IN ('image', 'video')),
  mime_type   TEXT,
  size_bytes  INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Simple key/value store for contact info, social links, and
-- presentation settings (autoplay, loop, default duration, ...).
-- Keys are namespaced by dot, e.g. 'contact.email', 'social.facebook',
-- 'presentation.autoplay'.
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Schema only for now — login/auth logic is a later phase.
CREATE TABLE IF NOT EXISTS admin_users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Server-side sessions, looked up by the opaque token stored in the
-- admin's HttpOnly cookie. Living in the same SQLite file as
-- everything else means a server restart does NOT log anyone out —
-- deliberate, since this may run unattended on a school computer.
-- expires_at slides forward on each authenticated request (see
-- middleware/auth.js) rather than being fixed at creation time.
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES admin_users(id),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);


-- Phase 16: edits to the content of the ten original scenes. One row per
-- scene; content_json holds {text, lists, media} overrides (see
-- lib/scene-content.js). A scene without a row shows its built-in content.
CREATE TABLE IF NOT EXISTS scene_content (
  scene_id      TEXT PRIMARY KEY,
  content_json  TEXT NOT NULL DEFAULT '{}',
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
