/* ============================================================
   SCENES/WELCOME-SCENE.JS
   Scene 002 — the first content scene, appearing immediately
   after the Opening Logo Reveal. Full-screen hero: campus photo,
   headline, tagline, and location/website/QR meta in the corners.
   All motion is scheduled calls into the existing AnimationEngine
   methods, exactly as in scenes/opening-logo.js — no new
   animation logic is introduced in JS. The one genuinely new
   motion (the slow background Ken Burns zoom) is plain CSS scoped
   to this scene's own stylesheet, not the shared animation engine.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

/**
 * Placeholder asset metadata, kept alongside the code that uses it
 * per the CDE-004 placeholder-management requirement. The admin
 * panel (future step) will read/replace entries like this rather
 * than the code needing to change when a real photo is uploaded.
 */
const BACKGROUND_ASSET = {
  assetId: 'welcome-campus',
  placeholderFile: MEDIA_LIBRARY.welcome.heroImage,
  description:
    'Wide panoramic photograph of Chrisland University Abeokuta campus during a bright sunny morning with students walking naturally across the campus. Landscape orientation. Premium quality.',
};

/**
 * Registers the Welcome scene against a SceneEngine.
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerWelcomeScene(sceneEngine) {
  // Pending timeline timers for this scene instance — cancelled in
  // cleanup() if the scene is exited before its natural duration.
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'welcome-scene',
    name: 'Welcome to Chrisland University',
    duration: 12000,
    transition: 'fade',
    layout: 'hero',

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('welcome-scene');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'welcome-scene');

      // ---- Background ----
      const background = document.createElement('div');
      background.className = 'welcome-scene__background';

      const bgImage = document.createElement('img');
      bgImage.className = 'welcome-scene__background-image';
      bgImage.src = sc.mediaSrc('heroImage', BACKGROUND_ASSET.placeholderFile);
      bgImage.alt = '';
      bgImage.setAttribute('aria-hidden', 'true');
      bgImage.onerror = () => {
        // Missing photo — fall back to a premium gradient rather
        // than an error or a broken-image icon.
        bgImage.remove();
        background.classList.add('welcome-scene__background--fallback');
      };
      background.appendChild(bgImage);

      const overlay = document.createElement('div');
      overlay.className = 'welcome-scene__overlay';

      // ---- Headline block (eyebrow + title + tagline) ----
      const content = document.createElement('div');
      content.className = 'welcome-scene__content hero-layout';

      const eyebrow = document.createElement('p');
      eyebrow.className = 'hero-layout__eyebrow welcome-scene__eyebrow';
      eyebrow.textContent = sc.text('eyebrow', 'WELCOME TO');

      const title = document.createElement('h1');
      title.className = 'hero-layout__title welcome-scene__title';
      title.textContent = sc.text('title', 'CHRISLAND UNIVERSITY');

      const tagline = document.createElement('p');
      tagline.className = 'welcome-scene__tagline';
      tagline.textContent = sc.text('tagline', 'Where Excellence Meets Innovation');

      content.append(eyebrow, title, tagline);

      // ---- Bottom-left: location ----
      const location = document.createElement('div');
      location.className = 'welcome-scene__location';
      // Phase 16: built with textContent (the text is admin-editable) — same
      // three <span> lines as the original markup.
      [
        sc.text('location1', 'Abeokuta'),
        sc.text('location2', 'Ogun State'),
        sc.text('location3', 'Nigeria'),
      ].forEach((line) => {
        const span = document.createElement('span');
        span.textContent = line;
        location.appendChild(span);
      });

      // ---- Bottom-right: website + QR placeholder ----
      const meta = document.createElement('div');
      meta.className = 'welcome-scene__meta';

      const website = document.createElement('p');
      website.className = 'welcome-scene__website';
      const websiteText = sc.text('website', 'www.chrislanduniversity.edu.ng');
      website.textContent = websiteText;

      const qr = document.createElement('div');
      qr.className = 'welcome-scene__qr';

      const qrImg = document.createElement('img');
      qrImg.className = 'welcome-scene__qr-image';
      qrImg.src = sc.mediaSrc('qrCode', MEDIA_LIBRARY.welcome.qrCode);
      qrImg.alt = `Scan to visit ${websiteText}`;
      qrImg.onerror = () => {
        // Missing QR asset — fall back to the original clean
        // placeholder in the exact same spot, no error thrown.
        qrImg.remove();
        qr.classList.add('welcome-scene__qr--fallback');
        qr.textContent = 'QR CODE';
      };
      qr.appendChild(qrImg);

      meta.append(website, qr);

      element.append(background, overlay, content, location, meta);

      // ------------------------------------------------------
      // Timeline — per the CDE-004 animation brief. The Ken Burns
      // background zoom is pure CSS (animation-delay: 0.5s, baked
      // into .welcome-scene__background-image), so it isn't
      // scheduled here. Everything else reuses AnimationEngine.
      // ------------------------------------------------------
      clearTimers();

      schedule(1200, () => animationEngine.slide(content, 'in', 'up'));
      // Heading (WELCOME TO / CHRISLAND UNIVERSITY) now gets ~1s
      // more solo reading time before the tagline transition begins.
      schedule(4200, () => animationEngine.slide(tagline, 'in', 'up'));
      schedule(5200, () => animationEngine.fade(location, 'in'));
      // Location line now gets ~0.8s more reading time before the
      // website transitions in.
      schedule(6800, () => animationEngine.fade(website, 'in'));
      schedule(7300, () => animationEngine.fade(qr, 'in'));
      // 6.0s–11.0s — stable hold, background keeps its slow zoom.
      // 12.0s dissolve into the next scene is handled by
      // SceneEngine's own exit transition, same as every scene.
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
