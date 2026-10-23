/* ============================================================
   ADMIN/JS/ADMIN-SHELL.JS
   Phase 12 — shared behavior for every authenticated admin page
   (Dashboard, Presentation Manager, and future sections): the
   session auth-gate, the topbar's signed-in username + logout
   button, and sidebar nav active-state highlighting.

   Does NOT reimplement authentication. Reuses exactly the same
   GET /api/auth/me / POST /api/auth/logout endpoints already built
   and verified in Phase 7 (backend/routes/auth.js), with the same
   same-origin credentials pattern already used by
   admin/js/auth-gate.js on the login page — that file is untouched
   by this phase.
   ============================================================ */

/**
 * Verifies the session, wires the topbar's signed-in label and
 * logout button, and marks the current page's sidebar nav item
 * active. Redirects to login.html if there is no valid session (or
 * the backend cannot be reached at all — unlike the public
 * presentation, the admin panel has no offline mode).
 *
 * Expects the page's HTML to already contain:
 *   - sidebar links with a `data-nav="<page-key>"` attribute
 *   - #admin-username in the topbar
 *   - #admin-logout button in the topbar
 *
 * @param {{activeNav: string}} options
 * @returns {Promise<{id:number, username:string}|null>} the signed-in user, or null if redirected away
 */
export async function initAdminShell({ activeNav }) {
  let user = null;

  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) {
      window.location.href = 'login.html';
      return null;
    }
    const data = await res.json();
    user = data.user;
  } catch (err) {
    window.location.href = 'login.html';
    return null;
  }

  const usernameEl = document.getElementById('admin-username');
  if (usernameEl) usernameEl.textContent = user.username;

  const logoutButton = document.getElementById('admin-logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      } finally {
        window.location.href = 'login.html';
      }
    });
  }

  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('admin-nav__item--active', el.dataset.nav === activeNav);
  });

  return user;
}

/**
 * Small fetch wrapper shared by every admin page: always sends the
 * session cookie, always parses JSON (even on an error response, so
 * the backend's `{error: "..."}` body is available), and throws
 * with that message so callers can show it directly.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export async function adminFetchJSON(url, options = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `${url} failed (${res.status})`);
  }
  return data;
}
