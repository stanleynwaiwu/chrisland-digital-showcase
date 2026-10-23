/* ============================================================
   SCENES/CLOSING-SIGNATURE.JS
   Scene 011 — the final scene before the presentation loops
   back to the Opening Logo Reveal. Minimal, centred composition:
   no new information, just a calm, elegant sign-off. Motion is
   scheduled calls into the existing AnimationEngine methods,
   same pattern as every prior scene. Registering this scene
   last means SceneEngine's own next-scene wraparound already
   takes it straight back to scene index 0 (Opening Logo Reveal)
   — no special-case looping logic needed.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';

/**
 * Reserved media configuration, per the CDE-013 media-readiness
 * spec — same shape as every other scene.
 */
const MEDIA_CONFIG = {
  type: 'none',
  path: '',
  description: 'Reserved for future media support',
};

const LOGO_SRC = MEDIA_LIBRARY.closingSignature.logo;

/**
 * Only the fields the brief calls out need editable metadata —
 * kept together here for future admin-panel editing.
 */
const CLOSING_FIELDS = {
  universityName: { id: 'closing-university-name', value: 'CHRISLAND UNIVERSITY' },
  tagline: { id: 'closing-tagline', value: 'Building Leaders for Tomorrow' },
  thankYou: { id: 'closing-thank-you', value: 'Thank You For Visiting' },
  website: { id: 'closing-website', value: 'www.chrislanduniversity.edu.ng' },
  logo: { id: 'closing-logo', placeholderFile: LOGO_SRC },
};

/**
 * Registers the Closing Signature scene against a SceneEngine.
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerClosingSignatureScene(sceneEngine) {
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'closing-signature',
    name: 'Closing Signature',
    duration: 12000,
    transition: 'fade',
    layout: 'center',
    media: MEDIA_CONFIG,

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('closing-signature');

      // ---- Background — premium dark gradient + ambient glow +
      // drifting particles echoing the opening reveal, no photo. ----
      const backdrop = document.createElement('div');
      backdrop.className = 'closing-signature__backdrop';

      const glow = document.createElement('div');
      glow.className = 'closing-signature__glow';

      const particles = document.createElement('div');
      particles.className = 'closing-signature__particles';
      const particlePositions = [
        { x: '15%', y: '22%', size: '4px', delay: '0s' },
        { x: '84%', y: '18%', size: '3px', delay: '-2.2s' },
        { x: '10%', y: '75%', size: '5px', delay: '-4.1s' },
        { x: '88%', y: '70%', size: '3px', delay: '-1.6s' },
      ];
      particlePositions.forEach((p) => {
        const dot = document.createElement('span');
        dot.className = 'closing-signature__particle';
        dot.style.left = p.x;
        dot.style.top = p.y;
        dot.style.width = p.size;
        dot.style.height = p.size;
        dot.style.animationDelay = p.delay;
        animationEngine.float(dot, true);
        particles.appendChild(dot);
      });

      // ---- Centred content ----
      const content = document.createElement('div');
      content.className = 'closing-signature__content';

      const mark = document.createElement('div');
      mark.className = 'closing-signature__mark';
      mark.dataset.fieldId = CLOSING_FIELDS.logo.id;

      const logoImg = document.createElement('img');
      logoImg.className = 'closing-signature__mark-image';
      logoImg.src = CLOSING_FIELDS.logo.placeholderFile;
      logoImg.alt = 'Chrisland University';
      logoImg.onerror = () => {
        logoImg.remove();
        mark.classList.add('closing-signature__mark--fallback');
        mark.textContent = 'LOGO';
      };
      mark.appendChild(logoImg);

      const universityName = document.createElement('h1');
      universityName.className = 'closing-signature__name';
      universityName.dataset.fieldId = CLOSING_FIELDS.universityName.id;
      universityName.textContent = CLOSING_FIELDS.universityName.value;

      const tagline = document.createElement('p');
      tagline.className = 'closing-signature__tagline';
      tagline.dataset.fieldId = CLOSING_FIELDS.tagline.id;
      tagline.textContent = CLOSING_FIELDS.tagline.value;

      const thankYou = document.createElement('p');
      thankYou.className = 'closing-signature__thank-you';
      thankYou.dataset.fieldId = CLOSING_FIELDS.thankYou.id;
      thankYou.textContent = CLOSING_FIELDS.thankYou.value;

      content.append(mark, universityName, tagline, thankYou);

      const website = document.createElement('p');
      website.className = 'closing-signature__website';
      website.dataset.fieldId = CLOSING_FIELDS.website.id;
      website.textContent = CLOSING_FIELDS.website.value;

      element.append(backdrop, glow, particles, content, website);

      // ------------------------------------------------------
      // Timeline — per the CDE-013 animation brief. The 6.0s
      // breathing glow reuses the existing .anim-glow keyframe
      // (already in animations.css) rather than a new one.
      // ------------------------------------------------------
      clearTimers();

      schedule(800, () => animationEngine.fade(glow, 'in'));
      schedule(1500, () => animationEngine.scale(mark, 'in'));
      schedule(2500, () => animationEngine.slide(universityName, 'in', 'up'));
      schedule(3500, () => animationEngine.fade(tagline, 'in'));
      schedule(4500, () => animationEngine.fade(thankYou, 'in'));
      schedule(5500, () => animationEngine.fade(website, 'in'));
      schedule(6000, () => glow.classList.add('anim-glow'));
      // 10.5s — everything begins an elegant fade to near-black,
      // ahead of SceneEngine's own exit transition at 12.0s, so
      // the wraparound into Scene 001 reads as one continuous
      // presentation rather than two back-to-back fades.
      schedule(10500, () => animationEngine.fade(content, 'out'));
      schedule(10500, () => animationEngine.fade(website, 'out'));
    },

    /**
     * Cancels any timeline steps still pending if the scene is
     * exited before its natural 12s duration completes.
     */
    cleanup() {
      clearTimers();
    },
  });
}
