/* ============================================================
   ADMIN/JS/DASHBOARD-PAGE.JS
   Phase 12 — Dashboard home. Summary numbers only; derives every
   value from the existing authenticated APIs (Scenes, Updates,
   News, Settings) rather than any new backend endpoint.
   ============================================================ */

import { initAdminShell, adminFetchJSON } from './admin-shell.js';

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadDashboard() {
  const errorEl = document.getElementById('dashboard-error');

  try {
    const [scenesData, updatesData, newsData, settingsData] = await Promise.all([
      adminFetchJSON('/api/scenes'),
      adminFetchJSON('/api/updates'),
      adminFetchJSON('/api/news'),
      adminFetchJSON('/api/settings'),
    ]);

    const scenes = scenesData.scenes ?? [];
    const activeScenes = scenes.filter((scene) => scene.enabled).length;

    setText('stat-total-scenes', String(scenes.length));
    setText('stat-active-scenes', String(activeScenes));
    setText('stat-inactive-scenes', String(scenes.length - activeScenes));
    setText('stat-updates-count', String((updatesData.updates ?? []).length));
    setText('stat-news-count', String((newsData.news ?? []).length));

    // presentation.autoPlay / .loop are stored as the strings
    // 'true'/'false' (see backend/db/migrate.js DEFAULT_SETTINGS) —
    // read, not changed, by this page.
    const presentation = settingsData.settings?.presentation ?? {};
    setText('stat-autoplay', presentation.autoPlay === 'true' ? 'On' : 'Off');
    setText('stat-loop', presentation.loop === 'true' ? 'On' : 'Off');

    if (errorEl) errorEl.hidden = true;
  } catch (err) {
    console.error('[dashboard] failed to load summary data:', err);
    if (errorEl) {
      errorEl.textContent = `Could not load dashboard data: ${err.message}`;
      errorEl.hidden = false;
    }
  }
}

async function init() {
  const user = await initAdminShell({ activeNav: 'dashboard' });
  if (!user) return;
  await loadDashboard();
}

init();
