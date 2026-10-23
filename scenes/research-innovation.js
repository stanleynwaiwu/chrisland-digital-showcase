/* ============================================================
   SCENES/RESEARCH-INNOVATION.JS
   Scene 007 — Research, Innovation & Facilities.

   Editorial cinematic mosaic:
   - Strong, concise hero statement on the left.
   - Supporting research/innovation copy beneath.
   - Four-image asymmetric mosaic on the right.
   - Premium animated gradient background.
   - Deliberately slower pacing so the audience has time to
     read and visually process the scene.

   Scene duration: 16 seconds.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

/**
 * Realistic placeholder body copy.
 */
const BODY_COPY =
  'Our laboratories, digital classrooms and research centres give students hands-on experience with real-world technology. Faculty-led research and industry partnerships turn curiosity into innovation.';

/**
 * Mosaic image placeholders, structured for future replacement
 * through the admin panel.
 */
const MOSAIC_IMAGES = [
  {
    assetId: 'facility-library',
    slot: 'libraryImage',
    role: 'large',
    placeholderFile: MEDIA_LIBRARY.researchInnovation.libraryImage,
    description:
      'Modern university library with students studying collaboratively.',
  },
  {
    assetId: 'facility-lab',
    slot: 'labImage',
    role: 'medium',
    placeholderFile: MEDIA_LIBRARY.researchInnovation.labImage,
    description:
      'Students conducting practical experiments in a modern laboratory.',
  },
  {
    assetId: 'facility-ict',
    slot: 'ictImage',
    role: 'small',
    placeholderFile: MEDIA_LIBRARY.researchInnovation.ictImage,
    description:
      'Modern ICT laboratory with contemporary computer workstations.',
  },
  {
    assetId: 'facility-innovation',
    slot: 'innovationImage',
    role: 'small',
    placeholderFile: MEDIA_LIBRARY.researchInnovation.innovationImage,
    description:
      'Innovation hub where students collaborate on technology and entrepreneurship projects.',
  },
];

/**
 * Capability highlights, structured for future admin editing.
 */
const CAPABILITY_HIGHLIGHTS = [
  {
    id: 'capability-smart-learning',
    title: 'Smart Learning Spaces',
    icon: 'placeholder',
  },
  {
    id: 'capability-research',
    title: 'Research Excellence',
    icon: 'placeholder',
  },
  {
    id: 'capability-innovation-hub',
    title: 'Innovation Hub',
    icon: 'placeholder',
  },
  {
    id: 'capability-industry',
    title: 'Industry Collaboration',
    icon: 'placeholder',
  },
];

/**
 * Registers the Research, Innovation & Facilities scene.
 *
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerResearchInnovationScene(sceneEngine) {
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'research-innovation',
    name: 'Research, Innovation & Facilities',

    // Increased from 12s to 16s to allow the scene to breathe.
    duration: 16000,

    transition: 'fade',
    layout: 'mosaic',

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('research-innovation');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'research-innovation');

      // ------------------------------------------------------
      // BACKGROUND
      // ------------------------------------------------------

      const background = document.createElement('div');
      background.className = 'research-innovation__background';

      // ------------------------------------------------------
      // LEFT — TEXT CONTENT
      // ------------------------------------------------------

      const content = document.createElement('div');
      content.className = 'research-innovation__content';

      const label = document.createElement('p');
      label.className = 'research-innovation__label';
      label.textContent = sc.text('label', 'RESEARCH & INNOVATION');

      const heading = document.createElement('h1');
      heading.className = 'research-innovation__heading';

      // Shorter and stronger hero message.
      heading.textContent = sc.text('heading', 'Where Ideas Become Innovation');

      const body = document.createElement('p');
      body.className = 'research-innovation__body';
      body.textContent = sc.text('body', BODY_COPY);

      const highlights = document.createElement('div');
      highlights.className = 'research-innovation__highlights';

      const highlightItems = sc
        .list('highlights', CAPABILITY_HIGHLIGHTS)
        .map((item) => {
        const el = document.createElement('div');

        el.className = 'research-innovation__highlight';
        el.dataset.highlightId = item.id;

        const mark = document.createElement('span');
        mark.className = 'research-innovation__highlight-mark';

        const itemLabel = document.createElement('span');
        itemLabel.className = 'research-innovation__highlight-label';
        itemLabel.textContent = item.title;

        el.append(mark, itemLabel);

        highlights.appendChild(el);

        return el;
      });

      content.append(
        label,
        heading,
        body,
        highlights
      );

      // ------------------------------------------------------
      // RIGHT — FOUR IMAGE ASYMMETRIC MOSAIC
      // ------------------------------------------------------

      const mosaic = document.createElement('div');
      mosaic.className = 'research-innovation__mosaic';

      const mosaicEls = MOSAIC_IMAGES.map((asset) => {
        const tile = document.createElement('div');

        tile.className =
          `research-innovation__mosaic-item ` +
          `research-innovation__mosaic-item--${asset.role}`;

        tile.dataset.assetId = asset.assetId;

        const img = document.createElement('img');

        img.className = 'research-innovation__mosaic-image';
        img.src = sc.mediaSrc(asset.slot, asset.placeholderFile);
        img.alt = asset.description;

        img.onerror = () => {
          img.remove();
          tile.classList.add(
            'research-innovation__mosaic-item--fallback'
          );
        };

        tile.appendChild(img);
        mosaic.appendChild(tile);

        return tile;
      });

      const [
        largeImage,
        mediumImage,
        smallImage1,
        smallImage2,
      ] = mosaicEls;

      element.append(
        background,
        content,
        mosaic
      );

      // ------------------------------------------------------
      // TIMELINE
      //
      // The timing is deliberately slower than the previous
      // 12-second version.
      //
      // Everything that enters remains visible.
      // ------------------------------------------------------

      clearTimers();

      /**
       * Ensures the element remains visible after its entrance
       * animation has completed.
       */
      const revealOnce = (animationPromise, el) =>
        animationPromise.then(() => {
          el.style.opacity = '1';
        });

      // ------------------------------------------------------
      // TEXT REVEAL
      // ------------------------------------------------------

      schedule(700, () =>
        revealOnce(
          animationEngine.fade(label, 'in'),
          label
        )
      );

      schedule(1300, () =>
        revealOnce(
          animationEngine.slide(
            heading,
            'in',
            'up'
          ),
          heading
        )
      );

      schedule(2300, () =>
        revealOnce(
          animationEngine.slide(
            body,
            'in',
            'up'
          ),
          body
        )
      );

      // ------------------------------------------------------
      // MOSAIC REVEAL
      //
      // Slower stagger gives the viewer time to understand
      // each visual instead of all four arriving together.
      // ------------------------------------------------------

      schedule(3200, () =>
        revealOnce(
          animationEngine.scale(
            largeImage,
            'in'
          ),
          largeImage
        )
      );

      schedule(3900, () =>
        revealOnce(
          animationEngine.scale(
            mediumImage,
            'in'
          ),
          mediumImage
        )
      );

      schedule(4600, () =>
        revealOnce(
          animationEngine.scale(
            smallImage1,
            'in'
          ),
          smallImage1
        )
      );

      schedule(5300, () =>
        revealOnce(
          animationEngine.scale(
            smallImage2,
            'in'
          ),
          smallImage2
        )
      );

      // ------------------------------------------------------
      // CAPABILITY HIGHLIGHTS
      //
      // Delayed until the visual mosaic has settled.
      // ------------------------------------------------------

      schedule(6200, () =>
        revealOnce(
          animationEngine.fade(
            highlightItems[0],
            'in'
          ),
          highlightItems[0]
        )
      );

      schedule(6700, () =>
        revealOnce(
          animationEngine.fade(
            highlightItems[1],
            'in'
          ),
          highlightItems[1]
        )
      );

      schedule(7200, () =>
        revealOnce(
          animationEngine.fade(
            highlightItems[2],
            'in'
          ),
          highlightItems[2]
        )
      );

      schedule(7700, () =>
        revealOnce(
          animationEngine.fade(
            highlightItems[3],
            'in'
          ),
          highlightItems[3]
        )
      );

      /*
       * 8.0s–16.0s
       *
       * Long cinematic hold.
       *
       * The viewer now has several seconds to:
       * - read the headline
       * - read the body
       * - process all four images
       * - understand the four capabilities
       *
       * The mosaic's subtle breathing animation continues
       * during this period.
       *
       * SceneEngine handles the final transition.
       */
    },

    /**
     * Cancels any timeline steps still pending if the scene
     * exits before its natural duration completes.
     */
    cleanup() {
      clearTimers();
    },
  });
}