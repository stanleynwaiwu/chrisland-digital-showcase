/* ============================================================
   ANIMATION-ENGINE.JS
   Thin, reusable helpers over the keyframes defined in
   animations.css. Scenes call these instead of touching class
   names directly, so timing and easing stay centralised.

   Primary API (used by scene-engine.js for enter/exit transitions):
     fade(element, phase)   phase: 'in' | 'out'
     slide(element, phase)
     zoom(element, phase)
     blur(element, phase)
     scale(element, phase)

   No CSS was added to support this — entrance keyframes already
   in animations.css are reused for exits by playing them in
   reverse (via the Web Animations "reverse" trick below) where a
   dedicated exit keyframe doesn't already exist.
   ============================================================ */

/**
 * Resolves once a CSS animation on the given element finishes,
 * or immediately if the user prefers reduced motion.
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
function waitForAnimation(element) {
  return new Promise((resolve) => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      resolve();
      return;
    }

    const onEnd = () => {
      element.removeEventListener('animationend', onEnd);
      resolve();
    };
    element.addEventListener('animationend', onEnd, { once: true });
  });
}

/**
 * Runs a named animation class on an element and resolves when it
 * completes, then cleans up so the animation can re-trigger later.
 * @param {HTMLElement} element
 * @param {string} className
 * @param {Object} [options]
 * @param {boolean} [options.reverse] - play the keyframe backwards,
 *   used to derive an "out" animation from an "in" keyframe without
 *   adding new CSS.
 * @returns {Promise<void>}
 */
function runAnimation(element, className, { reverse = false } = {}) {
  if (!element) return Promise.resolve();

  if (reverse) {
    element.style.animationDirection = 'reverse';
  }
  element.classList.add(className);

  return waitForAnimation(element).then(() => {
    element.classList.remove(className);
    if (reverse) {
      element.style.animationDirection = '';
    }
  });
}

export class AnimationEngine {
  /**
   * @param {Object} settings - global app settings (e.g. motion prefs)
   */
  constructor(settings = {}) {
    this.settings = settings;
  }

  /**
   * @param {HTMLElement} element
   * @param {'in'|'out'} [phase]
   */
  fade(element, phase = 'in') {
    return phase === 'out'
      ? runAnimation(element, 'anim-fade-out')
      : runAnimation(element, 'anim-fade-in');
  }

  /**
   * anim-slide-up/down only define an entrance keyframe, so the
   * exit phase plays the same keyframe in reverse — no CSS change
   * needed to get a matching "out" motion.
   * @param {HTMLElement} element
   * @param {'in'|'out'} [phase]
   * @param {'up'|'down'} [direction]
   */
  slide(element, phase = 'in', direction = 'up') {
    const className = direction === 'down' ? 'anim-slide-down' : 'anim-slide-up';
    return runAnimation(element, className, { reverse: phase === 'out' });
  }

  /**
   * @param {HTMLElement} element
   * @param {'in'|'out'} [phase]
   */
  zoom(element, phase = 'in') {
    return this.scale(element, phase);
  }

  /**
   * @param {HTMLElement} element
   * @param {'in'|'out'} [phase]
   */
  blur(element, phase = 'in') {
    return phase === 'out'
      ? runAnimation(element, 'anim-blur-out')
      : runAnimation(element, 'anim-blur-in');
  }

  /**
   * @param {HTMLElement} element
   * @param {'in'|'out'} [phase]
   */
  scale(element, phase = 'in') {
    return phase === 'out'
      ? runAnimation(element, 'anim-scale-out')
      : runAnimation(element, 'anim-scale-in');
  }

  // ----------------------------------------------------------
  // Backward-compatible named helpers — delegate to the generic
  // methods above so timing/easing logic lives in one place.
  // ----------------------------------------------------------

  /** @param {HTMLElement} element */
  fadeIn(element) {
    return this.fade(element, 'in');
  }

  /** @param {HTMLElement} element */
  fadeOut(element) {
    return this.fade(element, 'out');
  }

  /** @param {HTMLElement} element */
  slideUp(element) {
    return this.slide(element, 'in', 'up');
  }

  /** @param {HTMLElement} element */
  slideDown(element) {
    return this.slide(element, 'in', 'down');
  }

  /**
   * A light "reveal" combining blur + fade — used for premium,
   * cinematic scene or heading entrances.
   * @param {HTMLElement} element
   */
  lightReveal(element) {
    return this.blur(element, 'in');
  }

  /**
   * Starts (or stops) the ambient float loop on an element.
   * Unlike the other helpers this is a toggle, not a one-shot —
   * it does not resolve on completion since it loops indefinitely.
   * @param {HTMLElement} element
   * @param {boolean} enable
   */
  float(element, enable = true) {
    if (!element) return;
    element.classList.toggle('anim-float', enable);
  }

  /**
   * Applies a staggered entrance animation across a list of
   * elements, offsetting each by `staggerMs`.
   * @param {HTMLElement[]} elements
   * @param {string} className
   * @param {number} staggerMs
   */
  stagger(elements, className = 'anim-slide-up', staggerMs = 120) {
    elements.forEach((el, i) => {
      el.style.animationDelay = `${i * staggerMs}ms`;
      el.classList.add(className);
    });
  }
}
