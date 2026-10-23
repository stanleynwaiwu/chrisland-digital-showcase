/**
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 * PUT  /api/auth/password
 */
const express = require('express');
const db = require('../db/database');
const { hashPassword, verifyPassword } = require('../lib/passwords');
const {
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  createSession,
  destroySession,
  requireAuth,
} = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    // Same error for "no such user" and "wrong password" — don't
    // reveal which one it was.
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = createSession(user.id);
    setSessionCookie(res, token);
    res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('[POST /api/auth/login] failed:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

router.post('/logout', (req, res) => {
  const token = readSessionCookie(req);
  if (token) {
    try {
      destroySession(token);
    } catch (err) {
      // A failure here shouldn't stop the client from being logged
      // out on its side — the cookie is cleared regardless below.
      console.error('[POST /api/auth/logout] session cleanup failed:', err);
    }
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  try {
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user.id);
    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[PUT /api/auth/password] failed:', err);
    res.status(500).json({ error: 'Password change failed.' });
  }
});

module.exports = router;
