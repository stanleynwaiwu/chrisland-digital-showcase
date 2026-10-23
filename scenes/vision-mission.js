/* ============================================================
   SCENES/VISION-MISSION.JS
   Scene 003 — appears after the Welcome scene. Premium editorial
   split-screen: identity copy on the left, a framed campus photo
   on the right. Motion is scheduled calls into the existing
   AnimationEngine methods, same pattern as every prior scene.

   Refinement: Vision, Mission and Core Values each now have their
   OWN photograph — but there is still only ONE image frame, same
   position/size/spacing as before. When the chapter changes, that
   one frame performs a subtle card-turn (a scene-local CSS 3D
   rotation, not part of the shared AnimationEngine) to reveal the
   next photograph, synced with the text handoff.

   DISPLAY DURATION and INTERVAL remain separate concepts.

   Current timing:
   Vision      = 8.1s
   Mission     = 10.0s
   Core Values = 5.7s
   Intervals   = 0.2s

   Each category contains one statement. The statement remains
   visible for the entire duration of its category and leaves
   together with that category's image during the handoff.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

/**
 * Authentic Chrisland University identity copy.
 *
 * Each category deliberately contains ONE statement so the text
 * remains together with its corresponding photograph for the
 * entire category duration.
 */
const CONTENT_BLOCKS = [
  {
    label: 'VISION',
    positionClass: 'vision-mission__block--vision',
    mediaKey: 'visionImage',
    statements: [
      'To become a world-class university renowned for intellectual freedom, ethical scholarship, research, and the outstanding training of a new generation of leaders.',
    ],
  },
  {
    label: 'MISSION',
    positionClass: 'vision-mission__block--mission',
    mediaKey: 'missionImage',
    statements: [
      'To create a space that nurtures both sound moral values and intellectual culture, attracting excellent faculty and developing young people who are spiritually strong, intellectually capable, and professionally competent.',
    ],
  },
  {
    label: 'CORE VALUES',
    positionClass: 'vision-mission__block--core-values',
    mediaKey: 'coreValuesImage',
    statements: [
      'Intellectual Freedom, Ethical Standards, Research Excellence and Community Service — the four pillars that guide every decision we make.',
    ],
  },
];

/**
 * Timeline.
 *
 * The category durations are intentionally different because the
 * amount of information differs between the categories.
 *
 *   0.30s  image reveals
 *   0.90s  heading reveals
 *   2.20s  heading leaves
 *
 *   2.55s  Vision appears
 *  10.65s  Vision duration ends
 *  10.85s  Mission appears
 *
 *  20.85s  Mission duration ends
 *  21.05s  Core Values appears
 *
 *  26.75s  scene ends
 *
 * The 200ms intervals remain unchanged.
 */
const MEDIA_REVEAL_AT = 300;
const HEADING_REVEAL_AT = 900;
const HEADING_FADE_OUT_AT = 2200;

const VISION_REVEAL_AT = 2550;
const VISION_DISPLAY_DURATION_MS = 8100;
const VISION_FADE_OUT_AT =
  VISION_REVEAL_AT + VISION_DISPLAY_DURATION_MS;

const INTERVAL_BEFORE_MISSION_MS = 200;
const MISSION_REVEAL_AT =
  VISION_FADE_OUT_AT + INTERVAL_BEFORE_MISSION_MS;

const MISSION_DISPLAY_DURATION_MS = 10000;
const MISSION_FADE_OUT_AT =
  MISSION_REVEAL_AT + MISSION_DISPLAY_DURATION_MS;

const INTERVAL_BEFORE_CORE_VALUES_MS = 200;
const CORE_VALUES_REVEAL_AT =
  MISSION_FADE_OUT_AT + INTERVAL_BEFORE_CORE_VALUES_MS;

const CORE_VALUES_DISPLAY_DURATION_MS = 5700;

const SCENE_DURATION_MS =
  CORE_VALUES_REVEAL_AT + CORE_VALUES_DISPLAY_DURATION_MS;

/**
 * The card-turn itself — a scene-local 3D rotation.
 */
const FLIP_DURATION_MS = 600;

/**
 * IMPORTANT:
 *
 * The shared AnimationEngine uses the global slide animation
 * duration. That duration is longer than our 200ms chapter
 * interval, which allows the outgoing and incoming blocks to
 * overlap.
 *
 * We therefore make the OUT animation for this scene complete
 * inside the existing 200ms handoff interval.
 *
 * This does NOT change the category duration or the interval.
 * It only prevents the previous category from remaining visually
 * present underneath the next category.
 */
const CHAPTER_EXIT_DURATION_MS = 200;

/**
 * Registers the Vision, Mission & Core Values scene.
 *
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerVisionMissionScene(sceneEngine) {
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'vision-mission-values',
    name: 'Vision, Mission & Core Values',
    duration: SCENE_DURATION_MS,
    transition: 'blur',
    layout: 'split',

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('vision-mission');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'vision-mission-values');
      const editedBlocks = sc.list(
        'blocks',
        CONTENT_BLOCKS.map((b) => ({ label: b.label, text: b.statements[0] }))
      );
      const blocks = CONTENT_BLOCKS.map((b, i) => ({
        ...b,
        label: editedBlocks[i]?.label ?? b.label,
        statements: [editedBlocks[i]?.text ?? b.statements[0]],
      }));

      /**
       * Locks an element at its final visible opacity after its
       * entrance animation has completed.
       */
      const revealOnce = (
        animationPromise,
        el,
        targetOpacity = '1'
      ) =>
        animationPromise.then(() => {
          el.style.opacity = targetOpacity;
        });

      // ---- LEFT: editorial content column ----

      const content = document.createElement('div');
      content.className = 'vision-mission__content';

      const eyebrow = document.createElement('p');
      eyebrow.className = 'vision-mission__eyebrow';
      eyebrow.textContent = sc.text('eyebrow', 'OUR FOUNDATION');

      const heading = document.createElement('h1');
      heading.className = 'vision-mission__heading';
      heading.textContent = sc.text('heading', 'Vision, Mission & Core Values');

      const headingGroup = document.createElement('div');
      headingGroup.className =
        'vision-mission__heading-group';

      headingGroup.append(eyebrow, heading);

      const panel = document.createElement('div');
      panel.className = 'vision-mission__panel';

      const blocksEl = blocks.map((block) => {
        const wrapper = document.createElement('div');

        wrapper.className =
          `vision-mission__block ${block.positionClass}`;

        const label = document.createElement('p');

        label.className =
          'vision-mission__block-label';

        label.textContent = block.label;

        const statementsEl = block.statements.map(
          (statement) => {
            const p = document.createElement('p');

            p.className =
              'vision-mission__block-statement';

            p.textContent = statement;

            return p;
          }
        );

        wrapper.append(label, ...statementsEl);

        panel.appendChild(wrapper);

        return {
          wrapper,
          statementsEl,
        };
      });

      const [
        {
          wrapper: visionBlock,
          statementsEl: visionStatements,
        },
        {
          wrapper: missionBlock,
          statementsEl: missionStatements,
        },
        {
          wrapper: coreValuesBlock,
          statementsEl: coreValuesStatements,
        },
      ] = blocksEl;

      content.append(
        headingGroup,
        panel
      );

      // ---- RIGHT: ONE shared framed photo ----

      const media = document.createElement('div');

      media.className =
        'vision-mission__media';

      const frame = document.createElement('div');

      frame.className =
        'vision-mission__media-frame';

      const image = document.createElement('img');

      image.className =
        'vision-mission__media-image';

      image.src =
        sc.mediaSrc(
          CONTENT_BLOCKS[0].mediaKey,
          MEDIA_LIBRARY.visionMission[
            CONTENT_BLOCKS[0].mediaKey
          ]
        );

      image.alt = '';

      image.setAttribute(
        'aria-hidden',
        'true'
      );

      image.onerror = () => {
        image.remove();

        frame.classList.add(
          'vision-mission__media-frame--fallback'
        );
      };

      frame.appendChild(image);
      media.appendChild(frame);

      element.append(
        content,
        media
      );

      /**
       * Turns the shared frame to the next photograph.
       */
      function turnFrameTo(mediaKey) {
        frame.classList.add(
          'vision-mission__media-frame--turning'
        );

        schedule(
          FLIP_DURATION_MS / 2,
          () => {
            const nextSrc =
              sc.mediaSrc(
                mediaKey,
                MEDIA_LIBRARY.visionMission[mediaKey]
              );

            if (image.isConnected) {
              image.src = nextSrc;
            } else {
              frame.classList.remove(
                'vision-mission__media-frame--fallback'
              );

              const freshImage =
                document.createElement('img');

              freshImage.className =
                'vision-mission__media-image';

              freshImage.alt = '';

              freshImage.setAttribute(
                'aria-hidden',
                'true'
              );

              freshImage.onerror = () => {
                freshImage.remove();

                frame.classList.add(
                  'vision-mission__media-frame--fallback'
                );
              };

              freshImage.src = nextSrc;

              frame.appendChild(
                freshImage
              );
            }
          }
        );

        schedule(
          FLIP_DURATION_MS,
          () => {
            frame.classList.remove(
              'vision-mission__media-frame--turning'
            );
          }
        );
      }

      /**
       * Makes a chapter leave cleanly before the next chapter
       * appears.
       *
       * The category interval remains exactly 200ms.
       *
       * We temporarily shorten ONLY the outgoing slide animation
       * for this scene so it fits inside that 200ms handoff.
       */
      function exitChapter(block) {
        const previousDuration =
          block.style.animationDuration;

        block.style.animationDuration =
          `${CHAPTER_EXIT_DURATION_MS}ms`;

        const exitPromise =
          animationEngine.slide(
            block,
            'out',
            'up'
          );

        exitPromise.then(() => {
          block.style.animationDuration =
            previousDuration;

          // Explicitly guarantee that the old block cannot
          // remain underneath the next chapter.
          block.style.opacity = '0';
        });
      }

      clearTimers();

      // ------------------------------------------------------
      // INTRO
      // ------------------------------------------------------

      schedule(
        MEDIA_REVEAL_AT,
        () =>
          revealOnce(
            animationEngine.blur(
              media,
              'in'
            ),
            media
          )
      );

      schedule(
        HEADING_REVEAL_AT,
        () =>
          animationEngine.blur(
            headingGroup,
            'in'
          )
      );

      schedule(
        HEADING_FADE_OUT_AT,
        () =>
          animationEngine.blur(
            headingGroup,
            'out'
          )
      );

      // ------------------------------------------------------
      // VISION
      // ------------------------------------------------------

      schedule(
        VISION_REVEAL_AT,
        () =>
          revealOnce(
            animationEngine.slide(
              visionBlock,
              'in',
              'up'
            ),
            visionBlock
          )
      );

      visionStatements.forEach(
        (statementEl) => {
          schedule(
            VISION_REVEAL_AT,
            () =>
              revealOnce(
                animationEngine.fade(
                  statementEl,
                  'in'
                ),
                statementEl
              )
          );
        }
      );

      schedule(
        VISION_FADE_OUT_AT,
        () => {
          exitChapter(
            visionBlock
          );

          turnFrameTo(
            CONTENT_BLOCKS[1].mediaKey
          );
        }
      );

      // ------------------------------------------------------
      // MISSION
      // ------------------------------------------------------

      schedule(
        MISSION_REVEAL_AT,
        () =>
          revealOnce(
            animationEngine.slide(
              missionBlock,
              'in',
              'up'
            ),
            missionBlock
          )
      );

      missionStatements.forEach(
        (statementEl) => {
          schedule(
            MISSION_REVEAL_AT,
            () =>
              revealOnce(
                animationEngine.fade(
                  statementEl,
                  'in'
                ),
                statementEl
              )
          );
        }
      );

      schedule(
        MISSION_FADE_OUT_AT,
        () => {
          exitChapter(
            missionBlock
          );

          turnFrameTo(
            CONTENT_BLOCKS[2].mediaKey
          );
        }
      );

      // ------------------------------------------------------
      // CORE VALUES
      // ------------------------------------------------------

      schedule(
        CORE_VALUES_REVEAL_AT,
        () =>
          revealOnce(
            animationEngine.slide(
              coreValuesBlock,
              'in',
              'up'
            ),
            coreValuesBlock
          )
      );

      coreValuesStatements.forEach(
        (statementEl) => {
          schedule(
            CORE_VALUES_REVEAL_AT,
            () =>
              revealOnce(
                animationEngine.fade(
                  statementEl,
                  'in'
                ),
                statementEl
              )
          );
        }
      );
    },

    /**
     * Cancels pending timeline steps when the scene exits.
     */
    cleanup() {
      clearTimers();
    },
  });
}