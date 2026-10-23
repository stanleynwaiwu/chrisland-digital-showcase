/* ============================================================
   SCENES/STUDENT-LIFE.JS
   Scene 006 — Student Life & Campus Culture

   Cinematic composition:
   - Full-bleed campus/lifestyle background
   - Slow Ken Burns movement
   - Left-side editorial typography
   - Right-side three-image vertical collage
   - Lifestyle highlights
   - Extended cinematic hold before scene transition

   Narrative rhythm:

     0.0s  — Background establishes
     1.2s  — STUDENT LIFE label
     2.0s  — Main heading
     3.5s  — Supporting body copy

     5.5s  — Collage image 1
     7.5s  — Collage image 2
     9.5s  — Collage image 3

     11.5s — Highlight 1
     12.8s — Highlight 2
     14.1s — Highlight 3
     15.4s — Highlight 4

     16.5s–21.0s — Full cinematic composition holds

     22.0s — Scene ends and SceneEngine transitions onward

   The scene intentionally moves slower than earlier scenes.
   The audience should have enough time to read, observe and
   emotionally process the imagery rather than constantly
   chasing the next animation.

   Motion is scheduled through the existing AnimationEngine.
   No new animation system is introduced.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

/**
 * ------------------------------------------------------------
 * BACKGROUND ASSET
 * ------------------------------------------------------------
 *
 * Placeholder metadata for the dominant background image.
 * The actual file continues to come from MEDIA_LIBRARY.
 */
const BACKGROUND_ASSET = {
  assetId: 'student-life-background',
  placeholderFile: MEDIA_LIBRARY.studentLife.heroImage,
  description:
    'A vibrant university campus scene showing students collaborating, attending events, participating in sports, cultural activities and enjoying campus life in a bright, welcoming environment.',
};

/**
 * ------------------------------------------------------------
 * COLLAGE IMAGES
 * ------------------------------------------------------------
 *
 * Three visual chapters:
 *
 * 1. Learning / Collaboration
 * 2. Life / Recreation
 * 3. Achievement / Graduation
 *
 * The visual storytelling is intentional, even though we do not
 * place these labels visibly on screen.
 */
const COLLAGE_IMAGES = [
  {
    assetId: 'student-life-collage-1',
    placeholderFile: MEDIA_LIBRARY.studentLife.collage1,
    description: 'Students collaborating in a modern classroom.',
  },
  {
    assetId: 'student-life-collage-2',
    placeholderFile: MEDIA_LIBRARY.studentLife.collage2,
    description: 'Students participating in sports or recreational activities.',
  },
  {
    assetId: 'student-life-collage-3',
    placeholderFile: MEDIA_LIBRARY.studentLife.collage3,
    description: 'Graduation celebration with smiling graduates.',
  },
];

/**
 * ------------------------------------------------------------
 * LIFESTYLE HIGHLIGHTS
 * ------------------------------------------------------------
 *
 * Data-driven so the future admin panel can modify these
 * without changing the scene structure.
 */
const LIFESTYLE_HIGHLIGHTS = [
  {
    id: 'life-leadership',
    title: 'Leadership Development',
    icon: 'placeholder',
  },
  {
    id: 'life-clubs',
    title: 'Clubs & Societies',
    icon: 'placeholder',
  },
  {
    id: 'life-sports',
    title: 'Sports & Recreation',
    icon: 'placeholder',
  },
  {
    id: 'life-community',
    title: 'Community Engagement',
    icon: 'placeholder',
  },
];

/**
 * ------------------------------------------------------------
 * BODY COPY
 * ------------------------------------------------------------
 */
const BODY_COPY =
  'Beyond the classroom, students find mentorship, friendship, and a community that celebrates every achievement. From leadership programmes to student-led societies, campus life at Chrisland shapes well-rounded, confident graduates.';

/**
 * ------------------------------------------------------------
 * SCENE TIMING
 * ------------------------------------------------------------
 *
 * 22 seconds gives the audience enough time to:
 *
 * - Read the main message
 * - Study the three images
 * - Understand the lifestyle highlights
 * - Appreciate the composition before the transition
 */
const SCENE_DURATION_MS = 22000;

/**
 * Individual timeline positions.
 */
const TIMELINE = {
  label: 1200,
  heading: 2000,
  body: 3500,

  collageOne: 5500,
  collageTwo: 7500,
  collageThree: 9500,

  highlightOne: 11500,
  highlightTwo: 12800,
  highlightThree: 14100,
  highlightFour: 15400,
};

/**
 * ------------------------------------------------------------
 * REGISTER SCENE
 * ------------------------------------------------------------
 *
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerStudentLifeScene(sceneEngine) {
  let timers = [];

  /**
   * Schedule a timeline action.
   */
  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, Math.max(0, ms)));
  };

  /**
   * Cancel every pending timeline action.
   */
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'student-life',

    name: 'Student Life & Campus Culture',

    duration: SCENE_DURATION_MS,

    transition: 'fade',

    layout: 'collage',

    /**
     * --------------------------------------------------------
     * RENDER
     * --------------------------------------------------------
     *
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('student-life');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'student-life');

      /**
       * ------------------------------------------------------
       * ANIMATION STATE HELPER
       * ------------------------------------------------------
       *
       * AnimationEngine controls the entrance animation.
       *
       * Once an element has completed its animation, explicitly
       * lock it at opacity: 1.
       *
       * This prevents the element from disappearing if its base
       * CSS state is opacity: 0.
       */
      const revealOnce = (animationPromise, el) => {
        if (!el) return;

        animationPromise.then(() => {
          el.style.opacity = '1';
        });
      };

      /**
       * ------------------------------------------------------
       * BACKGROUND
       * ------------------------------------------------------
       */
      const background = document.createElement('div');
      background.className = 'student-life__background';

      const bgImage = document.createElement('img');

      bgImage.className = 'student-life__background-image';

      bgImage.src = sc.mediaSrc('heroImage', BACKGROUND_ASSET.placeholderFile);

      bgImage.alt = '';

      bgImage.setAttribute('aria-hidden', 'true');

      bgImage.onerror = () => {
        bgImage.remove();

        background.classList.add(
          'student-life__background--fallback'
        );
      };

      background.appendChild(bgImage);

      /**
       * ------------------------------------------------------
       * READABILITY OVERLAY
       * ------------------------------------------------------
       */
      const overlay = document.createElement('div');

      overlay.className = 'student-life__overlay';

      /**
       * ------------------------------------------------------
       * LEFT CONTENT
       * ------------------------------------------------------
       */
      const content = document.createElement('div');

      content.className = 'student-life__content';

      /**
       * Label
       */
      const label = document.createElement('p');

      label.className = 'student-life__label';

      label.textContent = sc.text('label', 'STUDENT LIFE');

      /**
       * Main heading
       */
      const heading = document.createElement('h1');

      heading.className = 'student-life__heading';

      heading.textContent = sc.text('heading', 'More Than a Degree');

      /**
       * Supporting paragraph
       */
      const body = document.createElement('p');

      body.className = 'student-life__body';

      body.textContent = sc.text('body', BODY_COPY);

      /**
       * ------------------------------------------------------
       * LIFESTYLE HIGHLIGHTS
       * ------------------------------------------------------
       */
      const highlights = document.createElement('div');

      highlights.className = 'student-life__highlights';

      const highlightItems = sc
        .list('highlights', LIFESTYLE_HIGHLIGHTS)
        .map((item) => {
        const highlight = document.createElement('div');

        highlight.className = 'student-life__highlight';

        highlight.dataset.highlightId = item.id;

        /**
         * Decorative marker.
         */
        const mark = document.createElement('span');

        mark.className = 'student-life__highlight-mark';

        /**
         * Highlight title.
         */
        const itemLabel = document.createElement('span');

        itemLabel.className =
          'student-life__highlight-label';

        itemLabel.textContent = item.title;

        highlight.append(mark, itemLabel);

        highlights.appendChild(highlight);

        return highlight;
      });

      content.append(
        label,
        heading,
        body,
        highlights
      );

      /**
       * ------------------------------------------------------
       * RIGHT COLLAGE
       * ------------------------------------------------------
       */
      const collage = document.createElement('div');

      collage.className = 'student-life__collage';

      const collageEls = COLLAGE_IMAGES.map((asset, index) => {
        const tile = document.createElement('div');

        tile.className = 'student-life__collage-item';

        tile.dataset.assetId = asset.assetId;

        tile.dataset.collageIndex = String(index);

        const img = document.createElement('img');

        img.className = 'student-life__collage-image';

        img.src = sc.mediaSrc(`collage${index + 1}`, asset.placeholderFile);

        img.alt = asset.description;

        img.onerror = () => {
          img.remove();

          tile.classList.add(
            'student-life__collage-item--fallback'
          );
        };

        tile.appendChild(img);

        collage.appendChild(tile);

        return tile;
      });

      /**
       * ------------------------------------------------------
       * MOUNT EVERYTHING
       * ------------------------------------------------------
       */
      element.append(
        background,
        overlay,
        content,
        collage
      );

      /**
       * ------------------------------------------------------
       * CLEAR OLD TIMELINE
       * ------------------------------------------------------
       */
      clearTimers();

      /**
       * ======================================================
       * MOVEMENT 1 — ESTABLISH THE WORLD
       * ======================================================
       *
       * The scene does NOT immediately throw everything onto
       * the screen.
       *
       * The background gets time to establish atmosphere first.
       */

      /**
       * 1.2s — small editorial label.
       */
      schedule(TIMELINE.label, () => {
        revealOnce(
          animationEngine.fade(label, 'in'),
          label
        );
      });

      /**
       * 2.0s — main statement.
       */
      schedule(TIMELINE.heading, () => {
        revealOnce(
          animationEngine.slide(
            heading,
            'in',
            'up'
          ),
          heading
        );
      });

      /**
       * 3.5s — body copy.
       *
       * Deliberately separated from the heading so the viewer
       * does not have to process both simultaneously.
       */
      schedule(TIMELINE.body, () => {
        revealOnce(
          animationEngine.slide(
            body,
            'in',
            'up'
          ),
          body
        );
      });

      /**
       * ======================================================
       * MOVEMENT 2 — VISUAL STORY
       * ======================================================
       *
       * The collage now becomes the secondary storytelling
       * device.
       *
       * Each image gets a full two-second introduction window.
       *
       * Once revealed, it stays visible for the remainder of
       * the scene.
       */

      /**
       * 5.5s — first image.
       *
       * Represents learning/collaboration.
       */
      schedule(TIMELINE.collageOne, () => {
        revealOnce(
          animationEngine.scale(
            collageEls[0],
            'in'
          ),
          collageEls[0]
        );
      });

      /**
       * 7.5s — second image.
       *
       * Represents student life/recreation.
       */
      schedule(TIMELINE.collageTwo, () => {
        revealOnce(
          animationEngine.scale(
            collageEls[1],
            'in'
          ),
          collageEls[1]
        );
      });

      /**
       * 9.5s — third image.
       *
       * Represents achievement/graduation.
       */
      schedule(TIMELINE.collageThree, () => {
        revealOnce(
          animationEngine.scale(
            collageEls[2],
            'in'
          ),
          collageEls[2]
        );
      });

      /**
       * ======================================================
       * MOVEMENT 3 — WHAT CAMPUS LIFE OFFERS
       * ======================================================
       *
       * Highlights arrive slowly instead of appearing as a
       * rapid checklist.
       */

      schedule(TIMELINE.highlightOne, () => {
        revealOnce(
          animationEngine.fade(
            highlightItems[0],
            'in'
          ),
          highlightItems[0]
        );
      });

      schedule(TIMELINE.highlightTwo, () => {
        revealOnce(
          animationEngine.fade(
            highlightItems[1],
            'in'
          ),
          highlightItems[1]
        );
      });

      schedule(TIMELINE.highlightThree, () => {
        revealOnce(
          animationEngine.fade(
            highlightItems[2],
            'in'
          ),
          highlightItems[2]
        );
      });

      schedule(TIMELINE.highlightFour, () => {
        revealOnce(
          animationEngine.fade(
            highlightItems[3],
            'in'
          ),
          highlightItems[3]
        );
      });

      /**
       * ======================================================
       * FINAL CINEMATIC HOLD
       * ======================================================
       *
       * 16.5s → 22s
       *
       * Nothing new is introduced.
       *
       * The audience simply gets to experience the finished
       * composition:
       *
       *   More Than a Degree
       *   +
       *   supporting copy
       *   +
       *   three images
       *   +
       *   four lifestyle pillars
       *
       * The slow background motion continues underneath.
       *
       * This is intentional.
       *
       * Cinematic pacing needs moments of stillness.
       */
    },

    /**
     * --------------------------------------------------------
     * CLEANUP
     * --------------------------------------------------------
     *
     * Cancels pending timeline steps when SceneEngine exits
     * the scene early.
     */
    cleanup() {
      clearTimers();
    },
  });
}