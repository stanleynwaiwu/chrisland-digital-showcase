/* ============================================================
   SCENES/OPENING-LOGO.JS
   The Chrisland Experience's opening cinematic — the very first
   thing a visitor sees. Registers a single scene ("opening-logo")
   with the existing SceneEngine. All motion is driven through
   AnimationEngine's existing methods (fade/slide/zoom + the
   float/light-sweep ambient classes) — no new animation logic is
   introduced here, only the choreography of *when* to call them.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

const INTRO_VIDEO_SRC = MEDIA_LIBRARY.openingLogo.heroVideo;

// A handful of curated particle positions rather than random
// scatter — keeps the "very few, premium" feel deliberate instead
// of noisy, and keeps the layout identical on every play.
const PARTICLES = [
  { x: '18%', y: '24%', size: '5px', delay: '0s' },
  { x: '82%', y: '20%', size: '4px', delay: '-1.4s' },
  { x: '12%', y: '72%', size: '6px', delay: '-3.1s' },
  { x: '88%', y: '68%', size: '4px', delay: '-2.2s' },
  { x: '50%', y: '14%', size: '3px', delay: '-4.4s' },
  { x: '65%', y: '82%', size: '5px', delay: '-0.8s' },
];

/**
 * Registers the Opening Logo Reveal scene against a SceneEngine.
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerOpeningLogoScene(sceneEngine) {
  // Pending timeline timers, tracked per scene instance so
  // cleanup() can cancel anything still scheduled if the scene is
  // skipped early (e.g. via the Next keyboard shortcut).
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'opening-logo',
    name: 'Opening Logo Reveal',
    duration: 9000,
    transition: 'fade',
    layout: 'hero',

    /**
     * Builds the DOM for the scene. Everything starts visually
     * hidden via opening-logo.css; the timeline below reveals each
     * piece at the moments specified in the design brief.
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('opening-logo');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'opening-logo');

      const backdrop = document.createElement('div');
      backdrop.className = 'opening-logo__backdrop';

      const glow = document.createElement('div');
      glow.className = 'opening-logo__glow';

      const sweep = document.createElement('div');
      sweep.className = 'opening-logo__sweep';

      const particles = document.createElement('div');
      particles.className = 'opening-logo__particles';
      PARTICLES.forEach((p) => {
        const particle = document.createElement('span');
        particle.className = 'opening-logo__particle';
        particle.style.left = p.x;
        particle.style.top = p.y;
        particle.style.width = p.size;
        particle.style.height = p.size;
        // Inline overrides vary each particle's drift so they
        // don't move in lockstep, without touching the shared
        // .anim-float keyframe in animations.css.
        particle.style.animationDelay = p.delay;
        particles.appendChild(particle);
      });

      const content = document.createElement('div');
      content.className = 'opening-logo__content';

      // Pre-rendered animated logo intro video — replaces the
      // previously generated logo reveal (mark, glow, scale-in,
      // placeholder). Autoplays muted, plays once, no loop. If the
      // source is missing, it's simply removed on error — the rest
      // of the scene continues normally, no error is thrown, and
      // the scene still advances to the Welcome Scene on its usual
      // timer, unchanged.
      const introVideo = document.createElement('video');
      introVideo.className = 'opening-logo__video';
      introVideo.src = sc.mediaSrc('heroVideo', INTRO_VIDEO_SRC);
      introVideo.autoplay = true;
      introVideo.muted = true;
      introVideo.loop = false;
      introVideo.playsInline = true;
      introVideo.setAttribute('aria-hidden', 'true');
      introVideo.addEventListener('error', () => introVideo.remove());

      const title = document.createElement('h1');
      title.className = 'opening-logo__title';
      title.textContent = sc.text('title', 'CHRISLAND UNIVERSITY');

      const tagline = document.createElement('p');
      tagline.className = 'opening-logo__tagline';
      tagline.textContent = sc.text('tagline', 'Intellectual Radiance');

      content.append(introVideo, title, tagline);
      element.append(backdrop, glow, sweep, particles, content);

      // ------------------------------------------------------
      // Timeline — all timings per the CDE-003 animation brief.
      // Each step reuses an existing AnimationEngine method; the
      // only thing choreographed here is the schedule itself.
      // ------------------------------------------------------
      clearTimers();

      schedule(500, () => animationEngine.fade(glow, 'in'));
      schedule(1500, () => sweep.classList.add('anim-light-sweep'));
      schedule(2500, () => {
        animationEngine.fade(particles, 'in');
        particles
          .querySelectorAll('.opening-logo__particle')
          .forEach((p) => animationEngine.float(p, true));
      });
      schedule(4500, () => animationEngine.slide(title, 'in', 'up'));
      schedule(5500, () => animationEngine.slide(tagline, 'in', 'up'));
      // 6.5s "everything gently settles" and 8.0s "hold" require no
      // further action — by this point every element has already
      // completed its entrance animation and simply stays in place.
      // The 9.0s dissolve into the next scene is handled by
      // SceneEngine's own exit transition when the Presentation
      // Engine advances the playlist.
    },

    /**
     * Cancels any timeline steps still pending if the scene is
     * exited before its natural 9s duration completes.
     */
    cleanup() {
      clearTimers();
    },
  });
}
