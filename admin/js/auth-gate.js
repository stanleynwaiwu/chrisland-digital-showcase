/**
 * Minimal login-page logic for Phase 7. Requests are same-origin
 * (this page is served by the same Express server as /api/*), so
 * the session cookie is sent automatically by the browser — no
 * manual token handling needed here at all.
 */

const form = document.getElementById('login-form');
const statusEl = document.getElementById('status');
const signedInPanel = document.getElementById('signed-in-panel');
const signedInAs = document.getElementById('signed-in-as');
const logoutButton = document.getElementById('logout-button');

function setStatus(message) {
  statusEl.textContent = message || '';
}

function showSignedIn(user) {
  form.hidden = true;
  signedInPanel.hidden = false;
  signedInAs.textContent = `Signed in as ${user.username}`;
}

function showSignedOut() {
  form.hidden = false;
  signedInPanel.hidden = true;
}

async function checkSession() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) {
      showSignedOut();
      return;
    }
    const data = await res.json();
    showSignedIn(data.user);
  } catch (err) {
    // Backend unreachable — this is the admin panel, not the
    // display, so it's fine to just surface this rather than
    // silently fall back to anything.
    setStatus('Could not reach the server.');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Signing in…');

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || 'Sign in failed.');
      return;
    }

    // Correction pass: a successful sign-in used to just reveal the
    // "signed in" panel on this same page, leaving the administrator
    // to notice and click "Go to Dashboard" themselves. Redirect
    // straight into the admin area instead, same as any other
    // session-gated page's flow (see admin-shell.js's initAdminShell,
    // which redirects the other way — to this page — when there is
    // no valid session).
    setStatus('Signed in — redirecting…');
    window.location.href = 'index.html';
  } catch (err) {
    setStatus('Could not reach the server.');
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    showSignedOut();
    form.reset();
    setStatus('Signed out.');
  }
});

checkSession();
