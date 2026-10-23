/* ============================================================
   APP.JS
   Application entry point. Loads settings, wires up the
   engines, and reveals the display once everything is ready.
   No scene content is registered here yet — that arrives in
   a later step.
   ============================================================ */

import { SceneEngine } from './scene-engine.js';
import { AnimationEngine } from './animation-engine.js';
import { AssetManager } from './asset-manager.js';
import { PresentationEngine } from './presentation-engine.js';
import { registerOpeningLogoScene } from '../scenes/opening-logo.js';
import { registerWelcomeScene } from '../scenes/welcome-scene.js';
import { registerVisionMissionScene } from '../scenes/vision-mission.js';
import { registerCampusExperienceScene } from '../scenes/campus-experience.js';
import { registerAcademicProgrammesScene } from '../scenes/academic-programmes.js';
import { registerStudentLifeScene } from '../scenes/student-life.js';
import { registerResearchInnovationScene } from '../scenes/research-innovation.js';
import { registerGraduateSuccessScene } from '../scenes/graduate-success.js';
import { registerAdmissionsScene } from '../scenes/admissions.js';
import { registerContactScene } from '../scenes/contact.js';
import { fetchPresentationData, getBackendOrigin } from './presentation-data.js';
import { registerLatestUpdatesScene } from '../scenes/latest-updates.js';
import { registerLatestNewsScene } from '../scenes/latest-news.js';
import { getEligibleItems, lagosToday, msUntilNextLagosMidnight } from './dynamic-content.js';

/**
 * Central application state. Kept intentionally small and
 * passed by reference into each engine so there is a single
 * source of truth for "what is the display currently doing".
 */
const AppState = {
  settings: null,
  scenes: null,
  announcements: null,
  isReady: false,
};

/* ------------------------------------------------------------
   PHASE 12 CORRECTION PASS — scene orchestration driven by the
   backend's Scene Configuration (GET /api/presentation -> scenes).

   This does NOT change how any individual scene renders. Every
   registerXScene() function below is completely untouched and is
   still the only place a scene's visuals/content/animations are
   defined. What changes is only:
     - WHICH of the 12 known scenes get registered (enabled),
     - in WHAT ORDER they get registered (SceneEngine's playback
       order is strictly its registration call order — see
       scene-engine.js's `_order` array), and
     - their `duration` property is overridden in place, after
       registration, when the backend supplies durationOverrideMs
       (SceneEngine/PresentationEngine already read `.duration`
       straight off the registered scene definition, so setting it
       post-registration is enough — no engine changes needed).
   ------------------------------------------------------------ */

/* ------------------------------------------------------------
   PHASE 14 — individual item slides + safe live refresh.

   The two dynamic sections stay ONE registered scene each; their
   slides, per-item durations and calculated section duration live
   inside the scenes (see js/dynamic-scene.js). What this file adds:

     - buildScenePlan(): the Phase 12 plan, minus any dynamic section
       with no item eligible today (Africa/Lagos) — so an empty
       section is skipped, never shown as an empty slide.
     - applyScenePlan(): puts the engine's registration list into
       that plan. It only ever runs at a scene boundary (the
       `scene:display` event) and never removes the scene on screen,
       so playback is not interrupted.
     - a periodic refresh (settings.backend.refreshIntervalMs,
       default 5 min) plus one at every Lagos midnight. A failed
       refresh keeps the last valid data; dates are also re-checked
       locally, so expiry does not depend on the backend or on a
       browser restart.
   ------------------------------------------------------------ */

const REFRESH_INTERVAL_DEFAULT_MS = 5 * 60 * 1000;
const REFRESH_INTERVAL_MIN_MS = 15 * 1000;
const MIDNIGHT_REFRESH_DELAY_MS = 2000;

// Original hardcoded order, preserved exactly as the fallback used
// whenever the backend is unreachable or returns no usable scene
// configuration (offline-first — identical behaviour to before this
// correction pass).
const ORIGINAL_SCENE_IDS = [
  'opening-logo',
  'welcome-scene',
  'vision-mission-values',
  'campus-experience',
  'academic-programmes',
  'student-life',
  'research-innovation',
  'graduate-success',
  'admissions',
  'contact',
];

// Dynamic scenes added in Phase 11 — disabled by default, only ever
// registered when the backend's scene configuration says so.
const DYNAMIC_SCENE_IDS = ['latest-updates', 'latest-news'];

// Maps every known scene id to its existing, untouched register
// function. Registration order is controlled entirely by the order
// in which this map's functions are invoked in initApp(), below.
const SCENE_REGISTRARS = {
  'opening-logo': registerOpeningLogoScene,
  'welcome-scene': registerWelcomeScene,
  'vision-mission-values': registerVisionMissionScene,
  'campus-experience': registerCampusExperienceScene,
  'academic-programmes': registerAcademicProgrammesScene,
  'student-life': registerStudentLifeScene,
  'research-innovation': registerResearchInnovationScene,
  'graduate-success': registerGraduateSuccessScene,
  admissions: registerAdmissionsScene,
  contact: registerContactScene,
  'latest-updates': registerLatestUpdatesScene,
  'latest-news': registerLatestNewsScene,
};

/**
 * Turns the backend's `scenes` array (from GET /api/presentation)
 * into an ordered list of { id, durationOverrideMs } entries to
 * register, already filtered to enabled scenes and sorted by
 * sortOrder.
 *
 * Offline-first fallback: when there is no usable backend scene
 * configuration at all (backend unreachable, or an empty/missing
 * array), this returns exactly the original hardcoded behaviour —
 * the 10 original scenes, in their original order, with no dynamic
 * scenes and no duration overrides — identical to how the
 * presentation behaved before this correction pass.
 *
 * @param {Array<{id:string, enabled:boolean, sortOrder:number, durationOverrideMs:number|null}>|undefined|null} sceneConfig
 * @returns {Array<{id:string, durationOverrideMs:number|null}>}
 */
function resolveScenePlan(sceneConfig) {
  if (!Array.isArray(sceneConfig) || sceneConfig.length === 0) {
    return ORIGINAL_SCENE_IDS.map((id) => ({ id, durationOverrideMs: null }));
  }

  const configById = new Map(sceneConfig.map((entry) => [entry.id, entry]));
  const allKnownIds = [...ORIGINAL_SCENE_IDS, ...DYNAMIC_SCENE_IDS];

  return allKnownIds
    .map((id, fallbackIndex) => {
      const entry = configById.get(id);

      if (entry) {
        return {
          id,
          enabled: Boolean(entry.enabled),
          sortOrder: Number.isFinite(entry.sortOrder) ? entry.sortOrder : fallbackIndex,
          durationOverrideMs: entry.durationOverrideMs ?? null,
        };
      }

      // A known scene the backend config didn't mention (shouldn't
      // normally happen — backend/db/migrate.js seeds all 12 — but
      // handled defensively): fall back to each scene's pre-Phase-12
      // default so behaviour degrades gracefully rather than
      // silently dropping a scene.
      return {
        id,
        enabled: !DYNAMIC_SCENE_IDS.includes(id),
        sortOrder: fallbackIndex,
        durationOverrideMs: null,
      };
    })
    .filter((scene) => scene.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ id, durationOverrideMs }) => ({ id, durationOverrideMs }));
}

/**
 * Fetches a JSON data file from /data.
 * Centralised here so every engine loads data the same way and
 * failures are handled consistently.
 * @param {string} filename
 * @returns {Promise<any>}
 */
async function loadJSON(filename) {
  const response = await fetch(`./data/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load data/${filename}: ${response.status}`);
  }
  return response.json();
}

/**
 * Loads every data file the display needs before boot.
 */
async function loadSettings() {
  const [settings, scenes, announcements] = await Promise.all([
    loadJSON('settings.json'),
    loadJSON('scenes.json'),
    loadJSON('announcements.json'),
  ]);

  AppState.settings = settings;
  AppState.scenes = scenes;
  AppState.announcements = announcements;
}

/**
 * Hides the loading screen once the display is ready to run.
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;

  loadingScreen.classList.add('is-hidden');
  loadingScreen.addEventListener(
    'transitionend',
    () => loadingScreen.remove(),
    { once: true }
  );
}

/**
 * Application bootstrap sequence.
 */
async function initApp() {
  try {
    // 1. Load settings + data
    await loadSettings();

    // 1b. Phase 11 — optional dynamic data from the backend admin
    // API. Offline-first: a null result means "backend unavailable"
    // and the presentation continues exactly as it did before
    // Phase 11 (the original ten scenes, no dynamic content).
    //
    // Phase 14: `dynamicData` is a LIVE store. The dynamic scenes read
    // it through settings.dynamicData every time they run, and the
    // refresh below replaces its arrays in place, so no scene needs to
    // be re-registered when content changes.
    const backendData = await fetchPresentationData(AppState.settings);
    const dynamicData = {
      updates: backendData?.updates ?? [],
      news: backendData?.news ?? [],
      backendOrigin: getBackendOrigin(AppState.settings),
      lastRefreshedAt: backendData ? Date.now() : null,
      // Phase 16: admin edits to the ten original scenes' content ({} when none).
      sceneContent: backendData?.sceneContent && typeof backendData.sceneContent === 'object' ? backendData.sceneContent : {},
    };
    AppState.settings.dynamicData = dynamicData;

    // Latest valid backend scene configuration (undefined = use the
    // original hardcoded plan). Replaced by each successful refresh.
    let sceneConfig = backendData?.scenes;

    // 2. Initialise engines
    const assetManager = new AssetManager(AppState.settings);
    const animationEngine = new AnimationEngine(AppState.settings);
    const sceneEngine = new SceneEngine({
      container: document.getElementById('scene-container'),
      assetManager,
      animationEngine,
      settings: AppState.settings,
    });

    await sceneEngine.init();

    let presentationEngine = null;

    // True while nothing is playable (no enabled scene has content) and the
    // display is waiting for a refresh to bring some. Distinguishes that from
    // a presentation that ended on purpose (loop off), which must not restart.
    let waitingForContent = false;

    // Hooks handed to every scene registrar (the ten original scenes
    // ignore them). The dynamic scenes use them to stay in step with
    // pause, and to ask for an early advance when live removals make
    // their run shorter than the duration the engine committed to.
    const sceneHooks = {
      isPaused: () => Boolean(presentationEngine?.isPaused),
      requestAdvance: (sceneId) => {
        if (!presentationEngine || !presentationEngine.isPlaying || presentationEngine.isPaused) return;
        if (!presentationEngine.config.autoPlay) return;
        if (sceneEngine.currentScene?.id !== sceneId) return;
        presentationEngine.next();
      },
    };

    // Scene definitions are captured once, when first registered, so
    // the engine's registration list can be re-ordered later using
    // only its public register()/unregister() API.
    const sceneDefinitions = new Map();
    const defaultDurations = new Map();

    /**
     * Phase 12 plan, minus dynamic sections with nothing eligible today.
     * @returns {Array<{id:string, durationOverrideMs:number|null}>}
     */
    const buildScenePlan = () => {
      const today = lagosToday();
      return resolveScenePlan(sceneConfig).filter(({ id }) => {
        if (!DYNAMIC_SCENE_IDS.includes(id)) return true;
        const items = id === 'latest-news' ? dynamicData.news : dynamicData.updates;
        return getEligibleItems(items, today).length > 0;
      });
    };

    /**
     * Puts the SceneEngine's registration list (== playback order) into
     * the given plan. Safe to call at boot and at scene boundaries; it
     * refuses to run in a way that would disturb playback:
     *   - an empty plan is never applied;
     *   - the scene currently on screen is never removed (retried at the
     *     next boundary instead);
     *   - currentIndex is re-pointed at the same scene after a reorder.
     * @param {Array<{id:string, durationOverrideMs:number|null}>} plan
     * @returns {boolean} whether the plan was applied
     */
    const applyScenePlan = (plan) => {
      const knownPlan = plan.filter(({ id }) => SCENE_REGISTRARS[id]);
      plan.forEach(({ id }) => {
        if (!SCENE_REGISTRARS[id]) {
          console.warn(`[Chrisland Experience] No register function found for scene id "${id}" — skipping.`);
        }
      });
      const desiredIds = knownPlan.map(({ id }) => id);
      if (desiredIds.length === 0) return false;

      const currentId = sceneEngine.currentScene?.id ?? null;
      if (currentId && !desiredIds.includes(currentId)) return false;

      knownPlan.forEach(({ id }) => {
        if (sceneDefinitions.has(id)) return;
        SCENE_REGISTRARS[id](sceneEngine, sceneHooks);
        const definition = sceneEngine.getSceneById(id);
        sceneDefinitions.set(id, definition);
        if (!DYNAMIC_SCENE_IDS.includes(id)) defaultDurations.set(id, definition.duration);
      });

      // Backend duration overrides apply to the ordinary scenes only.
      // The two dynamic sections' duration is calculated from their
      // items and is never overridden (the API rejects such overrides;
      // any legacy value is ignored here).
      knownPlan.forEach(({ id, durationOverrideMs }) => {
        if (DYNAMIC_SCENE_IDS.includes(id)) return;
        sceneDefinitions.get(id).duration = durationOverrideMs ?? defaultDurations.get(id);
      });

      const currentOrder = sceneEngine.getScenes().map((scene) => scene.id);
      const sameOrder =
        currentOrder.length === desiredIds.length &&
        currentOrder.every((id, index) => id === desiredIds[index]);
      if (!sameOrder) {
        currentOrder.forEach((id) => sceneEngine.unregister(id));
        desiredIds.forEach((id) => sceneEngine.register(sceneDefinitions.get(id)));
        if (currentId) sceneEngine.currentIndex = desiredIds.indexOf(currentId);
      }
      return true;
    };

    /**
     * Nothing is playable (every enabled scene has no content today, or
     * every scene is disabled). Stop cleanly, release the scene on screen
     * and show the engine's standard "no scenes" state — instead of
     * cycling through empty slides — then wait for a refresh to bring
     * content back (see refreshPresentationData).
     */
    const enterIdleState = () => {
      presentationEngine.stop();
      sceneEngine.currentScene?.cleanup?.();
      sceneEngine.getScenes().forEach((scene) => sceneEngine.unregister(scene.id));
      sceneEngine.currentScene = null;
      sceneEngine.currentIndex = -1;
      waitingForContent = true;
      presentationEngine.init(); // zero scenes -> renders the standard empty state
    };

    // Register scenes. SceneEngine's playback order is strictly its
    // registration order (see scene-engine.js), so the plan is applied
    // here, before playback starts, exactly as it is at every later
    // boundary. With the backend unreachable this resolves to the
    // original hardcoded ten-scene order — identical to the
    // presentation's pre-Phase-12 behaviour.
    applyScenePlan(buildScenePlan());

    // Re-apply the plan at every scene boundary so refreshed
    // configuration / content (and local date expiry) takes effect
    // without a restart and without interrupting the scene on screen.
    sceneEngine.addEventListener('scene:display', () => {
      try {
        const plan = buildScenePlan();
        if (plan.length === 0) {
          enterIdleState();
        } else {
          applyScenePlan(plan);
        }
      } catch (error) {
        console.warn('[Chrisland Experience] Could not apply the scene plan:', error);
      }
    });

    presentationEngine = new PresentationEngine({
      sceneEngine,
      container: document.getElementById('scene-container'),
      settings: AppState.settings,
    });

    // ---- Phase 14: periodic + midnight refresh ----
    let refreshInFlight = false;

    const refreshPresentationData = async () => {
      if (refreshInFlight) return;
      refreshInFlight = true;
      try {
        const data = await fetchPresentationData(AppState.settings);
        if (!data) return; // offline / error: keep the last valid data and plan

        if (Array.isArray(data.updates)) dynamicData.updates = data.updates;
        if (Array.isArray(data.news)) dynamicData.news = data.news;
        if (data.sceneContent && typeof data.sceneContent === 'object') dynamicData.sceneContent = data.sceneContent;
        if (Array.isArray(data.scenes) && data.scenes.length > 0) sceneConfig = data.scenes;
        dynamicData.lastRefreshedAt = Date.now();

        // Nothing was playable at boot: start as soon as something is.
        if (waitingForContent && applyScenePlan(buildScenePlan())) {
          waitingForContent = false;
          await presentationEngine.start();
        }
      } catch (error) {
        console.warn('[Chrisland Experience] Refresh failed — keeping the last valid data:', error);
      } finally {
        refreshInFlight = false;
      }
    };

    const configuredInterval = AppState.settings?.backend?.refreshIntervalMs;
    const refreshIntervalMs = Math.max(
      REFRESH_INTERVAL_MIN_MS,
      Number.isFinite(configuredInterval) ? configuredInterval : REFRESH_INTERVAL_DEFAULT_MS
    );

    // Chained timeouts (not setInterval) so a slow fetch can never stack up.
    const scheduleIntervalRefresh = () => {
      setTimeout(async () => {
        await refreshPresentationData();
        scheduleIntervalRefresh();
      }, refreshIntervalMs);
    };

    // One extra refresh just after every Lagos midnight, so items that
    // start (or expire) on the new date are picked up right away.
    const scheduleMidnightRefresh = () => {
      setTimeout(async () => {
        await refreshPresentationData();
        scheduleMidnightRefresh();
      }, msUntilNextLagosMidnight() + MIDNIGHT_REFRESH_DELAY_MS);
    };

    scheduleIntervalRefresh();
    scheduleMidnightRefresh();

    // Expose engines for later steps / debugging without polluting
    // the global namespace beyond a single root object.
    window.ChrislandExperience = {
      state: AppState,
      sceneEngine,
      animationEngine,
      assetManager,
      presentationEngine,
      // Phase 14 — exposed for diagnostics/tests only.
      dynamicData,
      refreshPresentationData,
      getScenePlan: buildScenePlan,
    };

    AppState.isReady = true;

    // 3. Reveal the display
    hideLoadingScreen();

    // 4. Hand off to the presentation engine. With no scenes
    // registered yet, init() renders the "no scenes" message and
    // returns false — start() is skipped until scenes exist.
    const hasScenes = presentationEngine.init();
    if (hasScenes) {
      await presentationEngine.start();
    } else {
      waitingForContent = true;
    }
  } catch (error) {
    console.error('[Chrisland Experience] Failed to initialise app:', error);
  }
}

document.addEventListener('DOMContentLoaded', initApp);
