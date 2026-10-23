/* ============================================================
   SCENES/GRADUATE-SUCCESS.JS
   Scene 008 — appears after Research, Innovation & Facilities.
   Balanced split layout: inspirational content on the left, a
   vertical four-milestone timeline on the right, over a
   graduate-celebration background photo.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

/**
 * Placeholder asset metadata for the background photo.
 */
const BACKGROUND_ASSET = {
  assetId: 'graduate-success-background',
  placeholderFile: MEDIA_LIBRARY.graduateSuccess.heroImage,
  description:
    'A diverse group of graduating university students celebrating their achievements while preparing for future careers.',
};

/** Realistic placeholder body copy — no Lorem Ipsum. */
const BODY_COPY =
  'A Chrisland education builds more than credentials — it builds character. Through academic rigour, leadership training and entrepreneurial thinking, our graduates step confidently into careers, startups and communities that need what they can offer.';

/**
 * Vertical timeline milestones, structured for future admin
 * editing per the CDE-010 admin-readiness spec.
 */
const TIMELINE_MILESTONES = [
  {
    id: 'milestone-admission',
    title: 'Admission',
    description: 'A welcoming start into a rigorous academic community.',
    icon: 'placeholder',
  },
  {
    id: 'milestone-learning',
    title: 'Learning',
    description: 'Hands-on scholarship across modern faculties and labs.',
    icon: 'placeholder',
  },
  {
    id: 'milestone-leadership',
    title: 'Leadership',
    description: 'Mentorship and student leadership shape confident voices.',
    icon: 'placeholder',
  },
  {
    id: 'milestone-career',
    title: 'Career Success',
    description: 'Graduates ready for careers, startups and impact.',
    icon: 'placeholder',
  },
];

/**
 * Achievement highlights, structured for future admin editing.
 */
const ACHIEVEMENT_HIGHLIGHTS = [
  {
    id: 'achievement-career-readiness',
    title: 'Career Readiness',
    icon: 'placeholder',
  },
  {
    id: 'achievement-leadership',
    title: 'Leadership Development',
    icon: 'placeholder',
  },
  {
    id: 'achievement-lifelong-learning',
    title: 'Lifelong Learning',
    icon: 'placeholder',
  },
];

/**
 * Registers the Graduate Success & Career Development scene.
 *
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerGraduateSuccessScene(sceneEngine) {
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'graduate-success',
    name: 'Graduate Success & Career Development',

    // Increased from 12s to 18s so the audience has
    // considerably more time to read the text.
    duration: 18000,

    transition: 'fade',
    layout: 'split',

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('graduate-success');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'graduate-success');

      // ---- Background ----
      const background = document.createElement('div');
      background.className = 'graduate-success__background';

      const bgImage = document.createElement('img');
      bgImage.className = 'graduate-success__background-image';
      bgImage.src = sc.mediaSrc('heroImage', BACKGROUND_ASSET.placeholderFile);
      bgImage.alt = '';
      bgImage.setAttribute('aria-hidden', 'true');

      bgImage.onerror = () => {
        bgImage.remove();
        background.classList.add('graduate-success__background--fallback');
      };

      background.appendChild(bgImage);

      const overlay = document.createElement('div');
      overlay.className = 'graduate-success__overlay';

      // ---- Left: inspirational content ----
      const content = document.createElement('div');
      content.className = 'graduate-success__content';

      const label = document.createElement('p');
      label.className = 'graduate-success__label';
      label.textContent = sc.text('label', 'YOUR FUTURE');

      const heading = document.createElement('h1');
      heading.className = 'graduate-success__heading';
      heading.textContent = sc.text('heading', 'Preparing Leaders for Tomorrow');

      const body = document.createElement('p');
      body.className = 'graduate-success__body';
      body.textContent = sc.text('body', BODY_COPY);

      const highlights = document.createElement('div');
      highlights.className = 'graduate-success__highlights';

      const highlightItems = sc
        .list('achievements', ACHIEVEMENT_HIGHLIGHTS)
        .map((item) => {
        const el = document.createElement('div');

        el.className = 'graduate-success__highlight';
        el.dataset.highlightId = item.id;

        const mark = document.createElement('span');
        mark.className = 'graduate-success__highlight-mark';

        const itemLabel = document.createElement('span');
        itemLabel.className = 'graduate-success__highlight-label';
        itemLabel.textContent = item.title;

        el.append(mark, itemLabel);
        highlights.appendChild(el);

        return el;
      });

      content.append(label, heading, body, highlights);

      // ---- Right: vertical timeline ----
      const timeline = document.createElement('div');
      timeline.className = 'graduate-success__timeline';

      const timelineItems = sc
        .list('milestones', TIMELINE_MILESTONES)
        .map((milestone) => {
        const item = document.createElement('div');

        item.className = 'graduate-success__milestone';
        item.dataset.milestoneId = milestone.id;

        const marker = document.createElement('span');
        marker.className = 'graduate-success__milestone-marker';

        const textGroup = document.createElement('div');
        textGroup.className = 'graduate-success__milestone-text';

        const title = document.createElement('h2');
        title.className = 'graduate-success__milestone-title';
        title.textContent = milestone.title;

        const description = document.createElement('p');
        description.className = 'graduate-success__milestone-description';
        description.textContent = milestone.description;

        textGroup.append(title, description);
        item.append(marker, textGroup);
        timeline.appendChild(item);

        return item;
      });

      element.append(background, overlay, content, timeline);

      // ------------------------------------------------------
      // TIMELINE
      //
      // The original entrance sequence is preserved.
      //
      // The important change is that the text elements are
      // allowed to remain visible substantially longer before
      // their individual disappearance.
      // ------------------------------------------------------

      clearTimers();

      // ---- Text entrance ----
      schedule(800, () => animationEngine.fade(label, 'in'));

      schedule(1400, () =>
        animationEngine.slide(heading, 'in', 'up')
      );

      schedule(2200, () =>
        animationEngine.fade(body, 'in')
      );

      // ---- Graduate Journey ----
      // Completely unchanged.
      schedule(3000, () =>
        animationEngine.slide(timelineItems[0], 'in', 'up')
      );

      schedule(3600, () =>
        animationEngine.slide(timelineItems[1], 'in', 'up')
      );

      schedule(4200, () =>
        animationEngine.slide(timelineItems[2], 'in', 'up')
      );

      schedule(4800, () =>
        animationEngine.slide(timelineItems[3], 'in', 'up')
      );

      // ---- Highlights ----
      // Completely unchanged.
      schedule(5500, () =>
        animationEngine.fade(highlightItems[0], 'in')
      );

      schedule(6000, () =>
        animationEngine.fade(highlightItems[1], 'in')
      );

      schedule(6500, () =>
        animationEngine.fade(highlightItems[2], 'in')
      );

      /*
       * IMPORTANT:
       *
       * The scene now has a much longer reading/holding period.
       *
       * 7s–15s:
       * The audience gets a proper breathing period to read
       * the main message and absorb the graduate journey.
       *
       * 15s–18s:
       * The existing individual disappearance behaviour can
       * complete naturally before the scene transitions.
       *
       * Nothing else about the visual composition is changed.
       */
    },

    /**
     * Cancels any timeline steps still pending if the scene
     * exits before its natural 18s duration completes.
     */
    cleanup() {
      clearTimers();
    },
  });
}