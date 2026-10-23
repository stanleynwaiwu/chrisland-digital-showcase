/* ============================================================
   SCENES/CAMPUS-EXPERIENCE.JS
   Scene 004 — Campus Experience

   Full-screen 2x2 composition of four cinematic video windows.
   Text appears as a temporary cinematic readability plate over
   the videos, allowing the footage to remain visible while
   keeping the messaging clean and easy to read.

   Video structure, stagger, looping behaviour and scene timing
   remain unchanged.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

/**
 * The four video windows, in entrance order.
 */
const VIDEO_CELLS = [
  { key: 'video1', positionClass: 'campus-experience__cell--tr' },
  { key: 'video2', positionClass: 'campus-experience__cell--tl' },
  { key: 'video3', positionClass: 'campus-experience__cell--br' },
  { key: 'video4', positionClass: 'campus-experience__cell--bl' },
];

/**
 * Short, fast-reader-friendly body copy.
 *
 * The original paragraph was too long for a digital display board.
 * This keeps the core message while allowing the audience to read
 * it comfortably without taking attention away from the videos.
 */
const BODY_COPY =
  'A vibrant campus where students learn, connect, and grow into confident leaders — in the classroom and beyond.';

/**
 * Highlight items.
 */
const HIGHLIGHTS = [
  'Modern Learning Spaces',
  'Safe & Inspiring Environment',
  'Active Student Community',
];

/**
 * Entrance stagger — 1s between each video window.
 */
const VIDEO_STAGGER_MS = 1000;

const LAST_VIDEO_REVEAL_AT =
  (VIDEO_CELLS.length - 1) * VIDEO_STAGGER_MS; // 3000ms

/**
 * Text reveal timeline.
 *
 * The existing timing is intentionally preserved.
 */
const LABEL_REVEAL_AT = LAST_VIDEO_REVEAL_AT + 600; // 3600ms
const HEADING_REVEAL_AT = LABEL_REVEAL_AT + 400; // 4000ms
const BODY_REVEAL_AT = HEADING_REVEAL_AT + 600; // 4600ms
const HIGHLIGHT_REVEAL_START_AT = BODY_REVEAL_AT + 800; // 5400ms
const HIGHLIGHT_STAGGER_MS = 400;

/**
 * Total scene duration remains unchanged.
 */
const SCENE_DURATION_MS = 13000;

/**
 * Registers the Campus Experience scene against a SceneEngine.
 *
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerCampusExperienceScene(sceneEngine) {
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'campus-experience',
    name: 'Campus Experience',
    duration: SCENE_DURATION_MS,
    transition: 'fade',
    layout: 'hero',

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('campus-experience');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'campus-experience');

      // ------------------------------------------------------
      // FOUR-VIDEO 2x2 GRID
      // ------------------------------------------------------

      const grid = document.createElement('div');
      grid.className = 'campus-experience__grid';

      const cellEls = VIDEO_CELLS.map(({ key, positionClass }) => {
        const cell = document.createElement('div');

        cell.className =
          `campus-experience__cell ${positionClass}`;

        const video = document.createElement('video');

        video.className = 'campus-experience__cell-video';
        video.src = sc.mediaSrc(key, MEDIA_LIBRARY.campusExperience[key]);
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('aria-hidden', 'true');

        video.addEventListener('error', () => {
          video.remove();

          cell.classList.add(
            'campus-experience__cell--fallback'
          );
        });

        cell.appendChild(video);
        grid.appendChild(cell);

        return cell;
      });

      // ------------------------------------------------------
      // TOP-LEFT LABEL
      // ------------------------------------------------------

      const label = document.createElement('p');

      label.className = 'campus-experience__label';
      label.textContent = sc.text('label', 'CAMPUS EXPERIENCE');

      // ------------------------------------------------------
      // CINEMATIC TEXT PLATE
      // ------------------------------------------------------

      const overlay = document.createElement('div');

      overlay.className = 'campus-experience__overlay';

      const content = document.createElement('div');

      content.className = 'campus-experience__content';

      // Heading
      const headingRow = document.createElement('div');

      headingRow.className =
        'campus-experience__heading-row';

      const accentBar = document.createElement('span');

      accentBar.className =
        'campus-experience__accent-bar';

      const heading = document.createElement('h1');

      heading.className =
        'campus-experience__heading';

      heading.textContent = sc.text('heading', 'Where Learning Comes Alive');

      headingRow.append(accentBar, heading);

      // Body
      const body = document.createElement('p');

      body.className =
        'campus-experience__body';

      body.textContent = sc.text('body', BODY_COPY);

      // Highlights
      const highlightsEl = document.createElement('div');

      highlightsEl.className =
        'campus-experience__highlights';

      const highlightItems = sc
        .list('highlights', HIGHLIGHTS.map((t) => ({ text: t })))
        .map((entry) => entry.text)
        .map((text) => {
        const item = document.createElement('div');

        item.className =
          'campus-experience__highlight';

        const mark = document.createElement('span');

        mark.className =
          'campus-experience__highlight-mark';

        const itemLabel = document.createElement('span');

        itemLabel.className =
          'campus-experience__highlight-label';

        itemLabel.textContent = text;

        item.append(mark, itemLabel);

        highlightsEl.appendChild(item);

        return item;
      });

      content.append(
        headingRow,
        body,
        highlightsEl
      );

      element.append(
        grid,
        overlay,
        label,
        content
      );

      // ------------------------------------------------------
      // TIMELINE
      // ------------------------------------------------------

      clearTimers();

      /**
       * Four video windows enter one after another.
       *
       * Once a video has entered, its opacity is explicitly
       * locked at 1 so it remains visible for the entire scene.
       */
      cellEls.forEach((cellEl, index) => {
        schedule(index * VIDEO_STAGGER_MS, () => {
          animationEngine
            .scale(cellEl, 'in')
            .then(() => {
              cellEl.style.opacity = '1';
            });
        });
      });

      /**
       * Text label.
       */
      schedule(
        LABEL_REVEAL_AT,
        () => animationEngine.fade(label, 'in')
      );

      /**
       * Heading.
       */
      schedule(
        HEADING_REVEAL_AT,
        () =>
          animationEngine.slide(
            headingRow,
            'in',
            'up'
          )
      );

      /**
       * Body.
       */
      schedule(
        BODY_REVEAL_AT,
        () =>
          animationEngine.slide(
            body,
            'in',
            'up'
          )
      );

      /**
       * Highlights.
       *
       * They remain visible after their entrance.
       */
      highlightItems.forEach((item, index) => {
        schedule(
          HIGHLIGHT_REVEAL_START_AT +
            index * HIGHLIGHT_STAGGER_MS,
          () =>
            animationEngine
              .fade(item, 'in')
              .then(() => {
                item.style.opacity = '1';
              })
        );
      });

      /*
       * From here until SCENE_DURATION_MS the scene simply holds.
       *
       * All four videos continue looping.
       * The text remains visible.
       * SceneEngine handles the final scene exit transition.
       */
    },

    /**
     * Cancels any timeline steps still pending if the scene
     * exits before its scheduled duration completes.
     */
    cleanup() {
      clearTimers();
    },
  });
}