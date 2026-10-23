# Chrisland Experience — Admin API (backend)

Lightweight local Node.js/Express/SQLite API. Runs **independently** of the
static presentation (`index.html`, `js/`, `scenes/`) — the display keeps
working normally with this server stopped, unreachable, or never started.

## Setup

```bash
cd backend
npm install
npm run migrate   # creates db/database.sqlite, applies schema, seeds
                   # current scene list, contact/social settings, and
                   # migrates data/announcements.json into `updates`
npm start          # http://localhost:4000
```

`npm run migrate` is safe to run again later — it never duplicates or
overwrites existing rows, it only fills in what's missing.

## What exists so far (foundation phase)

- `GET /api/health` — liveness check
- `GET /api/presentation` — the one consolidated payload the display will
  fetch at boot: current scene config, active updates, active news,
  contact/social/presentation settings

Auth and the admin CRUD routes (scenes, updates, news, media, settings)
are later phases, built on top of this foundation.

## Database

SQLite, file-based, at `backend/db/database.sqlite` (gitignored — generated
by `npm run migrate`, not committed). Schema: `backend/db/schema.sql`.
