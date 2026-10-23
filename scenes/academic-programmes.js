/* ============================================================
   SCENES/ACADEMIC-PROGRAMMES.JS

   Scene 004 — appears after Campus Experience.

   Cinematic multi-movement sequence:

     Movement 1 — Opening / Invitation
       Full-screen visual, "ACADEMICS" / "Discover Your Future"

     Movement 2 — Core academic disciplines
       Natural & Applied Sciences / Computing & Technology /
       Management & Social Sciences

       NOTE:
       Natural & Applied Sciences intentionally occupies the
       large visual position because Sciences is a major academic
       pillar of the institution.

     Movement 3 — Further academic pathways
       Arts & Humanities / Law / Postgraduate Studies

     Movement 4 — Closing
       "SIX PATHS. ONE PURPOSE."

   The four movements are separate full-screen layers within this
   ONE registered scene, crossfading into one another on their own
   internal schedule.

   Every programme's title, description and media reference is
   data-driven and sourced from MEDIA_LIBRARY.

   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

/**
 * The six programmes.

 * IMPORTANT:
 * Sciences intentionally comes FIRST because the first programme
 * in Movement 2 receives the large editorial panel.
 *
 * This gives Natural & Applied Sciences visual prominence without
 * changing the overall composition or adding unnecessary text.
 */
const PROGRAMMES = [
  {
    id: 'sciences',
    title: 'Natural & Applied Sciences',
    description: 'Research-driven study of the physical world.',
    mediaKey: 'sciences',
  },

  {
    id: 'computing',
    title: 'Computing & Technology',
    description: 'Software, data and emerging digital systems.',
    mediaKey: 'computing',
  },

  {
    id: 'management',
    title: 'Management & Social Sciences',
    description: 'Business, economics and human society.',
    mediaKey: 'management',
  },

  {
    id: 'arts',
    title: 'Arts & Humanities',
    description: 'Culture, language and creative expression.',
    mediaKey: 'arts',
  },

  {
    id: 'law',
    title: 'Law',
    description: 'Legal scholarship grounded in justice and ethics.',
    mediaKey: 'law',
  },

  {
    id: 'postgraduate',
    title: 'Postgraduate Studies',
    description: 'Advanced research across every discipline.',
    mediaKey: 'postgraduate',
  },
];

const FIRST_THREE = PROGRAMMES.slice(0, 3);
const SECOND_THREE = PROGRAMMES.slice(3, 6);

const OPENING_CONTENT = {
  label: 'ACADEMICS',
  heading: 'Discover Your Future',
  supporting: 'Where curiosity becomes capability.',
};

const CLOSING_CONTENT = {
  heading: 'SIX PATHS. ONE PURPOSE.',
  supporting: 'Preparing students to lead, create and contribute.',
};

/**
 * Builds an <img> or <video> element from a MEDIA_LIBRARY
 * configuration.
 *
 * @param {{
 *   mediaType: string,
 *   mediaPath: string,
 *   mediaDescription?: string
 * }} mediaConfig
 *
 * @param {string} className
 * @param {() => void} onFallback
 *
 * @returns {HTMLElement}
 */
/**
 * Phase 16: the media config for a slot — the built-in MEDIA_LIBRARY entry,
 * or the admin's uploaded file (image or video), or an unloadable source
 * when the admin removed it (so the existing onFallback runs).
 */
function resolveMediaConfig(sc, slot) {
  const base = MEDIA_LIBRARY.academicProgrammes[slot];
  return {
    ...base,
    mediaPath: sc.mediaSrc(slot, base.mediaPath),
    mediaType: sc.mediaType(slot, base.mediaType),
  };
}

function buildMediaElement(mediaConfig, className, onFallback) {
  const isVideo = mediaConfig.mediaType === 'video';

  const el = document.createElement(isVideo ? 'video' : 'img');

  el.className = className;
  el.setAttribute('aria-hidden', 'true');

  if (isVideo) {
    el.autoplay = true;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
  } else {
    el.alt = '';
  }

  el.addEventListener('error', () => {
    el.remove();
    onFallback();
  });

  el.src = mediaConfig.mediaPath;

  return el;
}

/**
 * Builds one programme panel.
 *
 * The same component is used in both Movement 2 and Movement 3.
 *
 * @param {{
 *   title: string,
 *   description: string,
 *   mediaKey: string
 * }} programme
 *
 * @returns {{
 *   panel: HTMLElement,
 *   mediaWrap: HTMLElement,
 *   text: HTMLElement
 * }}
 */
function buildProgrammePanel(programme, sc) {
  const panel = document.createElement('div');

  panel.className = 'academic-programmes__panel';
  panel.dataset.programmeId = programme.id;

  const mediaWrap = document.createElement('div');

  mediaWrap.className =
    'academic-programmes__panel-media';

  const mediaConfig =
    resolveMediaConfig(sc, programme.mediaKey);

  const mediaEl = buildMediaElement(
    mediaConfig,
    'academic-programmes__panel-media-asset',
    () =>
      mediaWrap.classList.add(
        'academic-programmes__panel-media--fallback'
      )
  );

  mediaWrap.appendChild(mediaEl);

  const overlay = document.createElement('div');

  overlay.className =
    'academic-programmes__panel-overlay';

  const text = document.createElement('div');

  text.className =
    'academic-programmes__panel-text';

  const title = document.createElement('h2');

  title.className =
    'academic-programmes__panel-title';

  title.textContent = programme.title;

  const description = document.createElement('p');

  description.className =
    'academic-programmes__panel-description';

  description.textContent = programme.description;

  text.append(title, description);

  panel.append(
    mediaWrap,
    overlay,
    text
  );

  return {
    panel,
    mediaWrap,
    text,
  };
}


// ============================================================
// TIMELINE
// ============================================================

const CROSSFADE_MS = 800;

const MOVEMENT_1_DURATION = 5500;
const MOVEMENT_2_DURATION = 7000;
const MOVEMENT_3_DURATION = 7000;
const MOVEMENT_4_DURATION = 4500;

const MOVEMENT_1_START = 0;

const MOVEMENT_2_START =
  MOVEMENT_1_START + MOVEMENT_1_DURATION;

const MOVEMENT_3_START =
  MOVEMENT_2_START + MOVEMENT_2_DURATION;

const MOVEMENT_4_START =
  MOVEMENT_3_START + MOVEMENT_3_DURATION;

const SCENE_DURATION_MS =
  MOVEMENT_4_START + MOVEMENT_4_DURATION;


// ============================================================
// SCENE REGISTRATION
// ============================================================

/**
 * Registers the Academic Programmes scene.
 *
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerAcademicProgrammesScene(sceneEngine) {
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(
      setTimeout(fn, Math.max(0, ms))
    );
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'academic-programmes',

    name: 'Faculties & Academic Programmes',

    duration: SCENE_DURATION_MS,

    transition: 'fade',

    layout: 'cinematic',


    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add(
        'academic-programmes'
      );

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'academic-programmes');
      const editedProgrammes = sc.list('programmes', PROGRAMMES);
      const programmes = PROGRAMMES.map((p, i) => ({
        ...p,
        title: editedProgrammes[i]?.title ?? p.title,
        description: editedProgrammes[i]?.description ?? p.description,
      }));
      const firstThree = programmes.slice(0, 3);
      const secondThree = programmes.slice(3, 6);


      // --------------------------------------------------------
      // REVEAL HELPERS
      // --------------------------------------------------------

      const revealOnce = (
        animationPromise,
        el
      ) =>
        animationPromise.then(() => {
          el.style.opacity = '1';
        });


      const showMovement = (el) =>
        revealOnce(
          animationEngine.fade(el, 'in'),
          el
        );


      const hideMovement = (el) =>
        animationEngine
          .fade(el, 'out')
          .then(() => {
            el.style.opacity = '0';
          });


      const crossfade = (
        outEl,
        inEl,
        atMs
      ) => {
        const at =
          atMs - CROSSFADE_MS / 2;

        schedule(at, () => {
          if (outEl) {
            hideMovement(outEl);
          }

          showMovement(inEl);
        });
      };


      // ========================================================
      // MOVEMENT 1 — OPENING
      // ========================================================

      const movement1 =
        document.createElement('div');

      movement1.className =
        'academic-programmes__movement academic-programmes__movement--opening';


      const openingMediaWrap =
        document.createElement('div');

      openingMediaWrap.className =
        'academic-programmes__opening-media';


      const openingMediaEl =
        buildMediaElement(
          resolveMediaConfig(sc, 'opening'),

          'academic-programmes__opening-media-asset',

          () =>
            openingMediaWrap.classList.add(
              'academic-programmes__opening-media--fallback'
            )
        );


      openingMediaWrap.appendChild(
        openingMediaEl
      );


      const openingOverlay =
        document.createElement('div');

      openingOverlay.className =
        'academic-programmes__opening-overlay';


      const openingContent =
        document.createElement('div');

      openingContent.className =
        'academic-programmes__opening-content';


      const openingLabel =
        document.createElement('p');

      openingLabel.className =
        'academic-programmes__opening-label';

      openingLabel.textContent =
        sc.text('openingLabel', OPENING_CONTENT.label);


      const openingHeading =
        document.createElement('h1');

      openingHeading.className =
        'academic-programmes__opening-heading';

      openingHeading.textContent =
        sc.text('openingHeading', OPENING_CONTENT.heading);


      const openingSupporting =
        document.createElement('p');

      openingSupporting.className =
        'academic-programmes__opening-supporting';

      openingSupporting.textContent =
        sc.text('openingSupporting', OPENING_CONTENT.supporting);


      openingContent.append(
        openingLabel,
        openingHeading,
        openingSupporting
      );


      movement1.append(
        openingMediaWrap,
        openingOverlay,
        openingContent
      );


      // ========================================================
      // MOVEMENT 2 — CORE ACADEMIC DISCIPLINES
      //
      // Sciences is now the large hero panel.
      // ========================================================

      const movement2 =
        document.createElement('div');

      movement2.className =
        'academic-programmes__movement academic-programmes__movement--triad';


      const triad =
        document.createElement('div');

      triad.className =
        'academic-programmes__triad';


      const triadPanels =
        firstThree.map(
          (programme, index) => {
            const built =
              buildProgrammePanel(
                programme,
                sc
              );

            built.panel.classList.add(
              index === 0
                ? 'academic-programmes__panel--large'
                : 'academic-programmes__panel--medium'
            );

            triad.appendChild(
              built.panel
            );

            return built;
          }
        );


      movement2.appendChild(
        triad
      );


      // ========================================================
      // MOVEMENT 3 — SECOND THREE PROGRAMMES
      // ========================================================

      const movement3 =
        document.createElement('div');

      movement3.className =
        'academic-programmes__movement academic-programmes__movement--triptych';


      const triptych =
        document.createElement('div');

      triptych.className =
        'academic-programmes__triptych';


      const triptychPanels =
        secondThree.map(
          (programme) => {
            const built =
              buildProgrammePanel(
                programme,
                sc
              );

            built.panel.classList.add(
              'academic-programmes__panel--column'
            );

            triptych.appendChild(
              built.panel
            );

            return built;
          }
        );


      movement3.appendChild(
        triptych
      );


      // ========================================================
      // MOVEMENT 4 — CLOSING
      // ========================================================

      const movement4 =
        document.createElement('div');

      movement4.className =
        'academic-programmes__movement academic-programmes__movement--closing';


      const closingContent =
        document.createElement('div');

      closingContent.className =
        'academic-programmes__closing-content';


      const closingHeading =
        document.createElement('h1');

      closingHeading.className =
        'academic-programmes__closing-heading';

      closingHeading.textContent =
        sc.text('closingHeading', CLOSING_CONTENT.heading);


      const closingSupporting =
        document.createElement('p');

      closingSupporting.className =
        'academic-programmes__closing-supporting';

      closingSupporting.textContent =
        sc.text('closingSupporting', CLOSING_CONTENT.supporting);


      closingContent.append(
        closingHeading,
        closingSupporting
      );


      movement4.appendChild(
        closingContent
      );


      // Add all movements to scene.
      element.append(
        movement1,
        movement2,
        movement3,
        movement4
      );


      // ========================================================
      // TIMELINE
      // ========================================================

      clearTimers();


      // --------------------------------------------------------
      // MOVEMENT 1
      // --------------------------------------------------------

      schedule(
        MOVEMENT_1_START,
        () =>
          showMovement(movement1)
      );


      schedule(
        MOVEMENT_1_START + 300,
        () =>
          revealOnce(
            animationEngine.scale(
              openingMediaWrap,
              'in'
            ),
            openingMediaWrap
          )
      );


      schedule(
        MOVEMENT_1_START + 1000,
        () =>
          revealOnce(
            animationEngine.fade(
              openingLabel,
              'in'
            ),
            openingLabel
          )
      );


      schedule(
        MOVEMENT_1_START + 1500,
        () =>
          revealOnce(
            animationEngine.slide(
              openingHeading,
              'in',
              'up'
            ),
            openingHeading
          )
      );


      schedule(
        MOVEMENT_1_START + 2300,
        () =>
          revealOnce(
            animationEngine.fade(
              openingSupporting,
              'in'
            ),
            openingSupporting
          )
      );


      // --------------------------------------------------------
      // MOVEMENT 1 → MOVEMENT 2
      // --------------------------------------------------------

      crossfade(
        movement1,
        movement2,
        MOVEMENT_2_START
      );


      // --------------------------------------------------------
      // MOVEMENT 2
      //
      // Sciences → Computing → Management
      // --------------------------------------------------------

      const movement2Offsets = [
        0,
        900,
        1800,
      ];


      triadPanels.forEach(
        ({ mediaWrap, text }, index) => {
          const base =
            MOVEMENT_2_START +
            movement2Offsets[index];


          schedule(
            base,
            () =>
              revealOnce(
                animationEngine.scale(
                  mediaWrap,
                  'in'
                ),
                mediaWrap
              )
          );


          schedule(
            base + 400,
            () =>
              revealOnce(
                animationEngine.slide(
                  text,
                  'in',
                  'up'
                ),
                text
              )
          );
        }
      );


      // --------------------------------------------------------
      // MOVEMENT 2 → MOVEMENT 3
      // --------------------------------------------------------

      crossfade(
        movement2,
        movement3,
        MOVEMENT_3_START
      );


      // --------------------------------------------------------
      // MOVEMENT 3
      // --------------------------------------------------------

      const movement3Offsets = [
        0,
        700,
        1400,
      ];


      triptychPanels.forEach(
        ({ mediaWrap, text }, index) => {
          const base =
            MOVEMENT_3_START +
            movement3Offsets[index];


          schedule(
            base,
            () =>
              revealOnce(
                animationEngine.scale(
                  mediaWrap,
                  'in'
                ),
                mediaWrap
              )
          );


          schedule(
            base + 400,
            () =>
              revealOnce(
                animationEngine.slide(
                  text,
                  'in',
                  'up'
                ),
                text
              )
          );
        }
      );


      // --------------------------------------------------------
      // MOVEMENT 3 → MOVEMENT 4
      // --------------------------------------------------------

      crossfade(
        movement3,
        movement4,
        MOVEMENT_4_START
      );


      // --------------------------------------------------------
      // MOVEMENT 4
      // --------------------------------------------------------

      schedule(
        MOVEMENT_4_START + 300,
        () =>
          revealOnce(
            animationEngine.slide(
              closingHeading,
              'in',
              'up'
            ),
            closingHeading
          )
      );


      schedule(
        MOVEMENT_4_START + 900,
        () =>
          revealOnce(
            animationEngine.fade(
              closingSupporting,
              'in'
            ),
            closingSupporting
          )
      );
    },


    /**
     * Cancels pending timeline steps.
     */
    cleanup() {
      clearTimers();
    },
  });
}