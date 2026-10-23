/**
 * Chrisland Experience — Admin API
 *
 * Lightweight local Express server. Runs entirely independently of
 * the static presentation (index.html + js/ + scenes/) — the
 * display must keep working with this server stopped, offline, or
 * never started at all. This file does NOT serve the presentation
 * itself; that stays a plain static site (e.g. Live Server) exactly
 * as it does today.
 *
 * Origin/cookie note (Phase 7): the admin panel (admin/) IS now
 * served by this same server, at the same origin as the API. This
 * is deliberate and required, not incidental — the approved auth
 * design uses an HttpOnly, SameSite=Strict session cookie, which
 * browsers refuse to send on cross-site requests at all. Same-
 * origin is what makes that cookie actually work, and it also means
 * the admin panel needs no CORS configuration and gets none: cors()
 * below is scoped ONLY to the public, cookie-free routes the
 * separately-hosted presentation calls.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');

const presentationRouter = require('./routes/presentation');
const authRouter = require('./routes/auth');
const settingsRouter = require('./routes/settings');
const scenesRouter = require('./routes/scenes');
const updatesRouter = require('./routes/updates');
const newsRouter = require('./routes/news');
const sceneContentRouter = require('./routes/scene-content');
const { requireAuth, verifyMutationOrigin } = require('./middleware/auth');
const { UPLOADS_ROOT, ensureUploadDirs, purgeStaleTempFiles } = require('./lib/media');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Defense-in-depth alongside SameSite=Strict — see
// middleware/auth.js for what this does and does not cover.
app.use(verifyMutationOrigin);

// The admin panel, served from this same origin so its session
// cookie is same-site. Not the presentation — that stays separate.
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Uploaded media (images/videos for updates and news, Phase 15) —
// served as plain static files. The presentation runs on another
// origin and embeds them with <img>/<video>, so they are marked
// cross-origin-readable; `nosniff` stops a browser from guessing a
// type other than the one the (generated, allowlisted) extension
// implies. The upload temp folder is never served.
ensureUploadDirs();
purgeStaleTempFiles();
app.use('/uploads/.tmp', (req, res) => res.status(404).end());
app.use(
  '/uploads',
  express.static(UPLOADS_ROOT, {
    dotfiles: 'ignore',
    index: false,
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

app.use('/css', express.static(path.join(__dirname, '..', 'css')));

// ---- Public routes — no auth, permissive CORS (the presentation
// itself is served from a different origin/port and has no
// cookie/credentials to protect on these two GETs). ----
const publicCors = cors();

app.get('/api/health', publicCors, (req, res) => {
  res.json({ status: 'ok', service: 'chrisland-experience-backend', time: new Date().toISOString() });
});

app.use('/api/presentation', publicCors, presentationRouter);

// ---- Auth routes — same-origin only (no cors() applied). ----
app.use('/api/auth', authRouter);

// ---- Settings — protected (requireAuth applied inside the router
// itself, same pattern as auth.js's /me and /password routes). ----
app.use('/api/settings', settingsRouter);

// ---- Scene configuration — protected, same pattern as settings.
// Never creates/deletes scenes, only updates enabled/order/duration
// on the fixed set of rows seeded by db/migrate.js. ----
app.use('/api/scenes', scenesRouter);

// ---- Updates CRUD — protected, same pattern as settings/scenes.
// Full CRUD over the existing `updates` table; the public payload's
// `updates` field (routes/presentation.js) independently filters
// this same table to status='published' + active date range. ----
app.use('/api/updates', updatesRouter);

// ---- News CRUD — protected, same pattern as updates. Full CRUD
// over the existing `news` table; the public payload's `news` field
// (routes/presentation.js's getActiveNews()) independently filters
// this same table to status='published' + active date range. ----
app.use('/api/news', newsRouter);

// ---- Phase 16 — content of the ten original scenes (text + media) — protected.
// Never touches scene_config (enabled/order/duration) or the news/updates tables. ----
app.use('/api/scene-content', sceneContentRouter);

// ---- Temporary Phase 7 verification route ----
// Exists solely to prove requireAuth works end-to-end before any
// real protected feature routes exist (those start in a later
// phase). Safe to delete once Phase 9+ adds genuine protected
// routes to test against instead.
app.get('/api/_test/protected', requireAuth, (req, res) => {
  res.json({ ok: true, user: { id: req.user.id, username: req.user.username } });
});

// Defensive fallback: an unexpected error anywhere in the API
// should never crash the process (which would also take down the
// admin panel) — log it and respond, don't throw.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`[chrisland-experience-backend] listening on http://localhost:${PORT}`);
  console.log(`[chrisland-experience-backend] admin panel:  http://localhost:${PORT}/admin/login.html`);
  console.log('[chrisland-experience-backend] if this stops, the presentation itself keeps working');
});
