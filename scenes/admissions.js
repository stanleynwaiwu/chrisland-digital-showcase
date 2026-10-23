/* ============================================================
   SCENES/ADMISSIONS.JS
   Scene 009 — appears after Graduate Success & Career
   Development. The call-to-action scene: admissions copy + a
   contact CTA on the left, a vertical four-step application
   journey on the right, over a subtle animated gradient pattern
   (no photo). Motion is scheduled calls into the existing
   AnimationEngine methods, same pattern as every prior scene.
   ============================================================ */

/**
 * Reserved media configuration, per the CDE-011 media-readiness
 * spec. This scene uses no image or video, but every scene keeps
 * this shape so the architecture stays consistent project-wide.
 */
import { getSceneContent } from '../js/scene-content.js';

const MEDIA_CONFIG = {
  type: 'none',
  path: '',
  description: 'Reserved for future media support',
};

/** Realistic placeholder body copy — no Lorem Ipsum. */
const BODY_COPY =
  'Joining Chrisland University is simple and supportive from the very first step. Our admissions team is here to guide you through every stage, from choosing a programme to settling into campus life.';

/**
 * Admissions contact details, structured as editable metadata
 * per the CDE-011 admin-readiness spec.
 */
const ADMISSIONS_CONTACT = [
  {
    id: 'admissions-email',
    label: 'Email',
    value: 'admissions@chrisland.edu.ng',
  },
  {
    id: 'admissions-phone',
    label: 'Phone',
    value: '+234 XXX XXX XXXX',
  },
  {
    id: 'admissions-website',
    label: 'Website',
    value: 'www.chrislanduniversity.edu.ng',
  },
];

/**
 * The four-step application journey, structured for future
 * admin editing.
 */
const JOURNEY_STEPS = [
  {
    id: 'journey-choose-programme',
    title: 'Choose Your Programme',
    description: 'Explore our faculties and find the path that fits you.',
    icon: 'placeholder',
  },
  {
    id: 'journey-submit-application',
    title: 'Submit Your Application',
    description: 'Complete a simple online application in minutes.',
    icon: 'placeholder',
  },
  {
    id: 'journey-admission-decision',
    title: 'Receive Admission Decision',
    description: 'Our admissions team reviews and responds promptly.',
    icon: 'placeholder',
  },
  {
    id: 'journey-begin-academic-journey',
    title: 'Begin Your Academic Journey',
    description: 'Register, settle in, and start building your future.',
    icon: 'placeholder',
  },
];

/**
 * Registers the Admissions & How to Apply scene against a
 * SceneEngine.
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerAdmissionsScene(sceneEngine) {
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'admissions',
    name: 'Admissions & How to Apply',
    duration: 12000,
    transition: 'fade',
    layout: 'split',
    media: MEDIA_CONFIG,

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('admissions');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'admissions');

      // ---- Background — subtle animated gradient + abstract
      // academic pattern, no photo. ----
      const background = document.createElement('div');
      background.className = 'admissions__background';

      const pattern = document.createElement('div');
      pattern.className = 'admissions__pattern';
      background.appendChild(pattern);

      // ---- Left: primary content + CTA ----
      const content = document.createElement('div');
      content.className = 'admissions__content';

      const label = document.createElement('p');
      label.className = 'admissions__label';
      label.textContent = sc.text('label', 'ADMISSIONS');

      const heading = document.createElement('h1');
      heading.className = 'admissions__heading';
      heading.textContent = sc.text('heading', 'Begin Your Journey With Chrisland');

      const body = document.createElement('p');
      body.className = 'admissions__body';
      body.textContent = sc.text('body', BODY_COPY);

      const cta = document.createElement('div');
      cta.className = 'admissions__cta';

      const ctaLabel = document.createElement('p');
      ctaLabel.className = 'admissions__cta-label';
      ctaLabel.textContent = sc.text('ctaLabel', 'Admissions Office');

      const ctaList = document.createElement('div');
      ctaList.className = 'admissions__cta-list';

      sc.list('contacts', ADMISSIONS_CONTACT).forEach((field) => {
        const row = document.createElement('div');
        row.className = 'admissions__cta-row';
        row.dataset.fieldId = field.id;

        const fieldLabel = document.createElement('span');
        fieldLabel.className = 'admissions__cta-row-label';
        fieldLabel.textContent = field.label;

        const fieldValue = document.createElement('span');
        fieldValue.className = 'admissions__cta-row-value';
        fieldValue.textContent = field.value;

        row.append(fieldLabel, fieldValue);
        ctaList.appendChild(row);
      });

      cta.append(ctaLabel, ctaList);
      content.append(label, heading, body, cta);

      // ---- Right: vertical four-step journey ----
      const journey = document.createElement('div');
      journey.className = 'admissions__journey';

      const journeyItems = sc.list('steps', JOURNEY_STEPS).map((step, index) => {
        const item = document.createElement('div');
        item.className = 'admissions__step';
        item.dataset.stepId = step.id;

        const marker = document.createElement('span');
        marker.className = 'admissions__step-marker';
        marker.textContent = String(index + 1).padStart(2, '0');

        const textGroup = document.createElement('div');
        textGroup.className = 'admissions__step-text';

        const title = document.createElement('h2');
        title.className = 'admissions__step-title';
        title.textContent = step.title;

        const description = document.createElement('p');
        description.className = 'admissions__step-description';
        description.textContent = step.description;

        textGroup.append(title, description);
        item.append(marker, textGroup);
        journey.appendChild(item);
        return item;
      });

      element.append(background, content, journey);

      // ------------------------------------------------------
      // Timeline — per the CDE-011 animation brief. Every element
      // here occupies its own dedicated position (each journey
      // step is its own row; label/heading/body/cta are separate
      // spots) — none of them compete for the same space, so per
      // the position-competition rule, every one of them enters
      // once and then stays for the rest of the scene. This
      // matters especially for the four journey steps: they
      // represent a sequential process, so the audience should be
      // able to see the complete Choose → Submit → Decision →
      // Begin journey together by the end of the scene, not have
      // earlier steps vanish as later ones arrive.
      //
      // Without the explicit lock below, removing the animation
      // class after each entrance animation completes leaves
      // nothing overriding the element's base opacity: 0 rule, and
      // it silently disappears — the animation class only ever
      // provides a TEMPORARY opacity value, not a persistent one.
      // This is the same fix already proven on Scenes 002-004 and
      // 007 (Research & Innovation).
      // ------------------------------------------------------
      clearTimers();

      const revealOnce = (animationPromise, el) =>
        animationPromise.then(() => {
          el.style.opacity = '1';
        });

      schedule(800, () => revealOnce(animationEngine.fade(label, 'in'), label));
      schedule(1400, () => revealOnce(animationEngine.slide(heading, 'in', 'up'), heading));
      schedule(2200, () => revealOnce(animationEngine.fade(body, 'in'), body));
      schedule(3000, () => revealOnce(animationEngine.fade(cta, 'in'), cta));
      schedule(4000, () => revealOnce(animationEngine.slide(journeyItems[0], 'in', 'up'), journeyItems[0]));
      schedule(4600, () => revealOnce(animationEngine.slide(journeyItems[1], 'in', 'up'), journeyItems[1]));
      schedule(5200, () => revealOnce(animationEngine.slide(journeyItems[2], 'in', 'up'), journeyItems[2]));
      schedule(5800, () => revealOnce(animationEngine.slide(journeyItems[3], 'in', 'up'), journeyItems[3]));
      // 6.5s–11.0s — stable hold with very subtle ambient motion
      // only (pure CSS, see admissions.css). Every element revealed
      // above — the CTA and all four journey steps — stays fully
      // visible through this entire hold, so the complete four-step
      // journey is on screen together well before the scene ends.
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
