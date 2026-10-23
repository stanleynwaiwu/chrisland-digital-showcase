/* ============================================================
   JS/PRESENTATION-DATA.JS
   Phase 11 — fetches the consolidated backend payload
   (GET /api/presentation) that the Latest Updates / News dynamic
   scenes consume.

   Offline-first by design, same principle as every other phase of
   this backend: the admin API is additive infrastructure, and the
   display must keep working exactly as it does today if the
   backend is stopped, unreachable, or never started at all. Any
   failure here (network error, timeout, non-200, malformed JSON)
   resolves to null rather than throwing — app.js treats null as
   "no dynamic data available" and the existing 10-scene
   presentation is completely unaffected.

   No existing engine or scene file's contract changes because of
   this module — it only produces plain data that app.js attaches
   to the settings object already threaded through every scene's
   render(element, context) call.
   ============================================================ */

const DEFAULT_API_URL = 'http://localhost:4000/api/presentation';
const DEFAULT_TIMEOUT_MS = 2500;

/**
 * @param {Object} [settings] - AppState.settings (data/settings.json
 *   contents); reads the optional settings.backend.apiUrl /
 *   settings.backend.timeoutMs overrides if present.
 * @returns {Promise<{scenes: Array, updates: Array, news: Array, settings: Object}|null>}
 *   null means "backend unavailable" — never thrown as an error.
 */
export async function fetchPresentationData(settings = {}) {
  const apiUrl = settings?.backend?.apiUrl || DEFAULT_API_URL;
  const timeoutMs = settings?.backend?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    if (!response.ok) {
      console.warn(
        `[presentation-data] backend responded ${response.status} — continuing without dynamic data.`
      );
      return null;
    }
    return await response.json();
  } catch (err) {
    // Backend offline, unreachable, timed out, or returned invalid
    // JSON — an expected, normal state given the offline-first
    // requirement, not an application error.
    console.info(
      '[presentation-data] backend unavailable — continuing with the static presentation only.',
      err?.message ?? err
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Looks up whether a given dynamic scene id is enabled in the
 * backend's scene_config list (the same `scenes` array already
 * returned by /api/presentation and consumed by the Scene
 * Configuration API). Missing/absent/unreachable config always
 * resolves to "not enabled" — the required safe default.
 * @param {Array<{id:string, enabled:boolean}>} [sceneConfig]
 * @param {string} id
 * @returns {boolean}
 */
export function isDynamicSceneEnabled(sceneConfig, id) {
  if (!Array.isArray(sceneConfig)) return false;
  const entry = sceneConfig.find((scene) => scene.id === id);
  return Boolean(entry?.enabled);
}

/**
 * Derives the backend's own origin (e.g. "http://localhost:4000")
 * from the configured /api/presentation URL, so the News scene can
 * resolve the relative image paths the API returns (served
 * statically from backend/uploads) into loadable URLs.
 * @param {Object} [settings]
 * @returns {string} origin, or '' if it cannot be determined
 */
export function getBackendOrigin(settings = {}) {
  const apiUrl = settings?.backend?.apiUrl || DEFAULT_API_URL;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return '';
  }
}
