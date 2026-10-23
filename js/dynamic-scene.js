/* ============================================================
   JS/DYNAMIC-SCENE.JS
   Phase 14 — shared registration for the two dynamic sections
   (Latest News / Latest Updates).

   Each section is still exactly ONE scene registered with the
   SceneEngine (same register() contract as every other scene).
   What this adds is the scene's internals:

     - render() snapshots the section's currently-eligible items
       and runs them as individual slides (js/dynamic-sequence.js).
     - `duration` is a getter: during a run it is the sum of the
       snapshot's item durations (so PresentationEngine, which
       reads it once when the scene starts, commits to exactly the
       length of the run); when idle it is the sum over the items
       eligible right now.
     - cleanup() cancels the run's timers.

   No SceneEngine / PresentationEngine / AnimationEngine code is
   involved beyond the public register() call and the existing
   `scene:display` event.
   ============================================================ */

import { getEligibleItems, lagosToday, sumDurations } from './dynamic-content.js';
import { createDynamicSequence } from './dynamic-sequence.js';
import { prefetchImages } from './dynamic-media.js';

/**
 * @param {import('./scene-engine.js').SceneEngine} sceneEngine
 * @param {{isPaused?: () => boolean, requestAdvance?: (sceneId: string) => void}} hooks
 *   supplied by js/app.js; every hook is optional so a scene still
 *   works (without pause-awareness / early advance) if it is
 *   registered without them.
 * @param {Object} config
 * @param {string} config.id
 * @param {string} config.name
 * @param {Object} config.transition
 * @param {string} config.layout
 * @param {string} config.rootClass                BEM root, e.g. 'latest-news-scene'
 * @param {(settings:Object) => Array} config.getRawItems  the section's items from settings.dynamicData
 * @param {(item:Object, index:number, total:number, settings:Object) => HTMLElement} config.buildSlide
 */
export function registerDynamicSection(sceneEngine, hooks, config) {
  const { id, name, transition, layout, rootClass, getRawItems, buildSlide } = config;

  /** Items for the run in progress; null when the scene is not on screen. */
  let snapshot = null;
  let sequence = null;

  const eligibleNow = () => getEligibleItems(getRawItems(sceneEngine.settings), lagosToday());

  const stopRun = () => {
    if (sequence) sequence.destroy();
    sequence = null;
    snapshot = null;
  };

  // The run's clock starts when the scene is fully displayed — the
  // same moment PresentationEngine starts its scene timer.
  sceneEngine.addEventListener('scene:display', (event) => {
    if (event.detail?.scene?.id === id) sequence?.start();
  });

  sceneEngine.register({
    id,
    name,
    transition,
    layout,

    get duration() {
      return sumDurations(snapshot ?? eligibleNow());
    },

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { settings } = context;
      stopRun();

      element.classList.add(rootClass);

      const background = document.createElement('div');
      background.className = `${rootClass}__background`;

      const stage = document.createElement('div');
      stage.className = `dyn-stage ${rootClass}__stage`;

      element.append(background, stage);

      snapshot = eligibleNow();
      if (snapshot.length === 0) return;

      // Phase 15: have the run's images in the browser cache before their slides appear.
      prefetchImages(snapshot, settings?.dynamicData?.backendOrigin);

      sequence = createDynamicSequence({
        container: stage,
        items: snapshot,
        getLiveIds: () => new Set(eligibleNow().map((item) => item.id)),
        buildSlide: (item, index, total) => buildSlide(item, index, total, settings),
        isPaused: hooks?.isPaused,
        onEarlyFinish: () => hooks?.requestAdvance?.(id),
      });
      sequence.mount();
    },

    /** Cancels the run's clock and every pending slide timer. */
    cleanup() {
      stopRun();
    },
  });
}

/**
 * Picks a size bucket from text length so a very short or very long
 * title/summary adapts instead of overflowing (the CSS keys off
 * `data-size`). Pure — exported for testing.
 * @param {string} text
 * @param {number[]} limits ascending upper bounds for buckets 'xs'..; last bucket is open-ended
 * @returns {'s'|'m'|'l'|'xl'}
 */
export function sizeBucket(text, limits) {
  const length = (text ?? '').trim().length;
  if (length <= limits[0]) return 's';
  if (length <= limits[1]) return 'm';
  if (length <= limits[2]) return 'l';
  return 'xl';
}
