/* ============================================================
   JS/DYNAMIC-SEQUENCE.JS
   Phase 14 — the internal, per-item timeline of a dynamic
   section (Latest News / Latest Updates).

   A dynamic section is still ONE registered scene. While that
   scene is on screen this runner shows its items one slide at a
   time, each for its own duration, so the section's length is the
   sum of its items' durations.

   Design notes
   ------------
   * One setInterval clock per run. It starts when the scene is
     actually displayed (SceneEngine's `scene:display`, i.e. after
     the entrance transition) — the same moment PresentationEngine
     starts its own scene timer — so the last item's window ends
     when the scene's timer fires.
   * The clock honours pause: while PresentationEngine is paused
     the clock stands still, so pausing never desynchronises the
     slides from the scene timer.
   * Items are SNAPSHOTTED when the scene starts. A live refresh
     during a run can only REMOVE items (expired / unpublished /
     deleted); additions and edits take effect the next time the
     scene comes round. That keeps the run's timeline equal to the
     duration PresentationEngine already committed to.
   * If removals make the run finish earlier than that committed
     duration, `onEarlyFinish` asks the app to advance now instead
     of leaving the last slide (or an expired one) on screen.
   * Everything is cleaned up in destroy(): the interval, every
     pending slide-removal timeout, and any slide media (Phase 15).
     Slide enter/exit animation is
     pure CSS (classes `is-active` / `is-leaving`), so there are no
     JS animation handles to leak and no overlapping animations to
     cancel.
   ============================================================ */

import { sumDurations } from './dynamic-content.js';
import { disposeMedia } from './dynamic-media.js';

// If the run finishes more than this long before the scene's own
// timer would fire, ask the app to advance early. Inside the margin
// the scene timer is about to end the scene anyway, so doing nothing
// avoids a double advance.
const EARLY_FINISH_MARGIN_MS = 600;

/**
 * @param {Object} options
 * @param {HTMLElement} options.container          slides are appended here
 * @param {Array<{id:number, durationMs:number}>} options.items  snapshot, in display order
 * @param {() => Set<number>|null} [options.getLiveIds]  ids still eligible right now
 * @param {(item:Object, index:number, total:number) => HTMLElement} options.buildSlide
 * @param {() => boolean} [options.isPaused]
 * @param {() => void} [options.onEarlyFinish]
 * @param {number} [options.tickMs]
 * @param {number} [options.leaveMs]  how long a leaving slide stays in the DOM (match the CSS transition)
 */
export function createDynamicSequence({
  container,
  items,
  getLiveIds = () => null,
  buildSlide,
  isPaused = () => false,
  onEarlyFinish = () => {},
  tickMs = 100,
  leaveMs = 450,
}) {
  const totalMs = sumDurations(items);
  const dead = new Set();
  const leaveTimers = new Set();

  let index = -1;
  let slideEl = null;
  let intervalId = null;
  let lastTs = 0;
  let elapsedMs = 0;
  let shownMs = 0;
  let started = false;
  let finished = false;
  let destroyed = false;
  let earlyFinishFired = false;

  function retire(el) {
    if (!el) return;
    el.classList.remove('is-active');
    el.classList.add('is-leaving');
    const timer = setTimeout(() => {
      leaveTimers.delete(timer);
      disposeMedia(el); // pause/release any video before the slide goes
      el.remove();
    }, leaveMs);
    leaveTimers.add(timer);
  }

  function showItem(i) {
    retire(slideEl);
    slideEl = null;
    index = i;
    if (i < 0 || i >= items.length) return;

    const el = buildSlide(items[i], i, items.length);
    el.classList.add('dyn-slide');
    container.appendChild(el);
    slideEl = el;

    // Force the initial (hidden) style to be computed, then activate,
    // so the CSS transition always runs.
    requestAnimationFrame(() => {
      if (destroyed || slideEl !== el) return;
      void el.offsetWidth;
      el.classList.add('is-active');
    });
  }

  function nextAliveAfter(from) {
    for (let j = from + 1; j < items.length; j += 1) {
      if (!dead.has(items[j].id)) return j;
    }
    return -1;
  }

  function maybeFinishEarly() {
    if (earlyFinishFired) return;
    if (totalMs - elapsedMs > EARLY_FINISH_MARGIN_MS) {
      earlyFinishFired = true;
      onEarlyFinish();
    }
  }

  function advance(currentIsDead) {
    const next = nextAliveAfter(index);
    if (next !== -1) {
      showItem(next);
      return;
    }
    finished = true;
    if (currentIsDead) {
      // Nothing left to show and the slide on screen is no longer
      // valid — take it down rather than keep showing it.
      retire(slideEl);
      slideEl = null;
    }
    maybeFinishEarly();
  }

  function tick() {
    const now = performance.now();
    const delta = now - lastTs;
    lastTs = now;
    if (isPaused()) return;

    elapsedMs += delta;
    shownMs += delta;

    const live = getLiveIds();
    if (live) {
      items.forEach((item) => {
        if (!live.has(item.id)) dead.add(item.id);
      });
    }

    if (finished) return;

    const current = items[index];
    if (!current || dead.has(current.id)) {
      shownMs = 0;
      advance(true);
      return;
    }

    if (shownMs >= current.durationMs) {
      // Carry the overshoot forward so slide boundaries stay on the
      // absolute timeline instead of drifting by a tick per slide.
      shownMs -= current.durationMs;
      advance(false);
    }
  }

  return {
    /** Shows the first slide. Call from render(), before the entrance transition. */
    mount() {
      if (destroyed || items.length === 0) return;
      showItem(0);
    },

    /** Starts the clock. Call on `scene:display`. */
    start() {
      if (started || destroyed) return;
      started = true;
      lastTs = performance.now();
      intervalId = setInterval(tick, tickMs);
    },

    /** Stops the clock and cancels every pending timer. Safe to call twice. */
    destroy() {
      destroyed = true;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      leaveTimers.forEach(clearTimeout);
      leaveTimers.clear();
      disposeMedia(container); // release every video + cancel media load timers
      slideEl = null;
    },

    /** Test/diagnostic view of the run. */
    getState() {
      return {
        index,
        totalMs,
        elapsedMs,
        shownMs,
        finished,
        earlyFinishFired,
        deadIds: [...dead],
        pendingLeaveTimers: leaveTimers.size,
        running: intervalId !== null,
      };
    },
  };
}
