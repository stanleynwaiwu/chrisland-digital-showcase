/**
 * Session-based auth. A session is a random opaque token stored in
 * SQLite (table: sessions) and referenced by an HttpOnly cookie —
 * deliberately not a JWT (see the approved design discussion): the
 * token itself carries no information and can't be inspected or
 * forged client-side, and revoking it on logout is just a row
 * delete rather than waiting out an expiry.
 *
 * No `cookie-parser` dependency — the cookie header this project
 * needs to read is a single simple token, so parsing it by hand is
 * a few lines and avoids adding a package for it.
 */
const crypto = require('crypto');
const db = require('../db/database');

const SESSION_COOKIE_NAME = 'session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h, sliding

/**
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function readSessionCookie(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  const parts = header.split(';').map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq);
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return null;
}

/**
 * @param {import('express').Response} res
 * @param {string} token
 */
function setSessionCookie(res, token) {
  const maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);
  // HttpOnly: never readable by client-side JS (XSS mitigation).
  // SameSite=Strict: never sent on a cross-site request at all —
  // the admin panel is served from this same server/origin
  // specifically so this works (see server.js). No Secure flag:
  // this deployment is plain HTTP on a local machine, not HTTPS.
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

/**
 * @param {number} userId
 * @returns {string} the new session token
 */
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  );
  return token;
}

/**
 * Looks up a session by token. Expired sessions are deleted and
 * treated as not found, rather than left to accumulate.
 * @param {string} token
 * @returns {{token: string, userId: number, expiresAt: string}|null}
 */
function getValidSession(token) {
  if (!token) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { token: row.token, userId: row.user_id, expiresAt: row.expires_at };
}

/** Slides a session's expiry forward from "now". @param {string} token */
function touchSession(token) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('UPDATE sessions SET expires_at = ? WHERE token = ?').run(expiresAt, token);
}

/** @param {string} token */
function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Express middleware: requires a valid session, attaches
 * `req.user` ({id, username}), slides the session's expiry, or
 * responds 401 if there's no valid session.
 */
function requireAuth(req, res, next) {
  const token = readSessionCookie(req);
  const session = getValidSession(token);

  if (!session) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const user = db.prepare('SELECT id, username FROM admin_users WHERE id = ?').get(session.userId);
  if (!user) {
    // The user row is gone (e.g. deleted) but a stale session
    // pointed at it — clean it up rather than trust it.
    destroySession(token);
    return res.status(401).json({ error: 'Authentication required.' });
  }

  touchSession(token);
  req.user = user;
  req.sessionToken = token;
  next();
}

/**
 * Defense-in-depth alongside SameSite=Strict, per this phase's
 * explicit requirement to double-check cross-origin assumptions
 * for mutating requests. SameSite=Strict already stops the cookie
 * from being sent cross-site at all, so a forged cross-origin
 * mutation request would arrive with no session and fail
 * requireAuth anyway — this adds an independent, cookie-
 * unrelated check: if a mutating request DOES carry an Origin
 * header, it must match this server's own origin. No dependency
 * added; this is a deliberately small, V1-appropriate check, not a
 * full CSRF-token framework.
 */
function verifyMutationOrigin(req, res, next) {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!mutating) return next();

  const origin = req.headers.origin;
  // No Origin header at all (common for same-origin form posts in
  // some browsers, and for local tooling like curl) — nothing to
  // check against, so this layer defers entirely to SameSite +
  // requireAuth rather than guessing.
  if (!origin) return next();

  const expectedOrigin = `${req.protocol}://${req.get('host')}`;
  if (origin !== expectedOrigin) {
    return res.status(403).json({ error: 'Cross-origin request rejected.' });
  }
  next();
}

module.exports = {
  SESSION_COOKIE_NAME,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  createSession,
  getValidSession,
  touchSession,
  destroySession,
  requireAuth,
  verifyMutationOrigin,
};
