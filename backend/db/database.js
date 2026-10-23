/**
 * Single shared SQLite connection, via Node's own built-in
 * node:sqlite module (DatabaseSync) rather than a third-party
 * native addon. This is a deliberate choice: node:sqlite ships
 * inside Node itself, so there is no npm install / native
 * compilation step for it on any machine, on any Node version
 * from 22.13.0 onward — the exact class of "prebuilt binary not
 * available for your Node version, falls back to a native
 * compile that needs VC++ Build Tools" failure that better-
 * sqlite3 hit is structurally impossible here.
 *
 * As of Node 24.x this module is Stability 1.2 ("Release
 * Candidate") — the API is settled and not expected to change
 * further before full stabilisation, which is a reasonable trade
 * for a small internal admin tool doing straightforward CRUD.
 *
 * The database file lives outside version control; it's created
 * automatically by `npm run migrate` the first time.
 */
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new DatabaseSync(DB_PATH);

// better-sqlite3 exposed db.pragma('journal_mode = WAL') as a
// convenience method; node:sqlite has no equivalent helper, so the
// same PRAGMA is issued directly via exec() instead.
db.exec('PRAGMA journal_mode = WAL');

module.exports = db;
