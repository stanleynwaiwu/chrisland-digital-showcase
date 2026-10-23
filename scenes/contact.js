/* ============================================================
   SCENES/CONTACT.JS
   Scene 010 — appears after Admissions & How to Apply.

   Final information scene before the presentation loops.

   Three-zone editorial layout:
   - invitation copy on the left
   - contact information in the centre
   - QR code + social media on the right

   The scene uses the project's premium gradient with a subtle
   particle field and pulls the QR image from MEDIA_LIBRARY.

   Motion is scheduled through the existing AnimationEngine.
   ============================================================ */

import { MEDIA_LIBRARY } from '../js/media-library.js';
import { getSceneContent } from '../js/scene-content.js';

/**
 * Reserved media configuration, per the CDE-012 media-readiness
 * specification.
 */
const MEDIA_CONFIG = {
  type: 'none',
  path: '',
  description: 'Reserved for future media support',
};

/**
 * Realistic placeholder body copy — no Lorem Ipsum.
 */
const BODY_COPY =
  'Have a question, or ready to visit campus? Our team is here to help prospective students and parents every step of the way. Reach out — we would love to welcome you to Chrisland.';

/**
 * Contact information, structured as editable metadata
 * for future admin-panel integration.
 *
 * Values are plain text because the scene renders them
 * using textContent rather than HTML.
 */
const CONTACT_FIELDS = [
  {
    id: 'contact-website',
    label: 'Website',
    value: 'www.chrislanduniversity.edu.ng',
  },
  {
    id: 'contact-admissions-email',
    label: 'Admissions Email',
    value: 'admissions@chrisland.edu.ng',
  },
  {
    id: 'contact-general-email',
    label: 'General Email',
    value: 'info@chrisland.edu.ng',
  },
  {
    id: 'contact-telephone',
    label: 'Telephone',
    value: '+234 XXX XXX XXXX',
  },
  {
    id: 'contact-address',
    label: 'Campus Address',
    value: 'Chrisland University, Abeokuta, Ogun State, Nigeria',
  },
];

/**
 * Social media links, structured for future admin editing.
 */
const SOCIAL_LINKS = [
  {
    id: 'social-facebook',
    label: 'Facebook',
    handle: '@ChrislandUniversity',
  },
  {
    id: 'social-instagram',
    label: 'Instagram',
    handle: '@chrislanduniversity',
  },
  {
    id: 'social-linkedin',
    label: 'LinkedIn',
    handle: 'Chrisland University',
  },
  {
    id: 'social-youtube',
    label: 'YouTube',
    handle: 'Chrisland University',
  },
];

/**
 * QR code asset metadata.
 *
 * The actual image path comes from MEDIA_LIBRARY so the future
 * admin panel can replace the asset without modifying this scene.
 */
const QR_ASSET = {
  id: 'contact-qr',
  label: 'SCAN TO LEARN MORE',
  target: 'www.chrislanduniversity.edu.ng',
  placeholderFile: MEDIA_LIBRARY.contact.qrCode,
  description:
    'QR code linking visitors to the Chrisland University website.',
};

/**
 * Registers the Contact, Visit Us & Connect scene against
 * a SceneEngine.
 *
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 */
export function registerContactScene(sceneEngine) {
  let timers = [];

  const schedule = (ms, fn) => {
    timers.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  sceneEngine.register({
    id: 'contact',
    name: 'Contact, Visit Us & Connect',
    duration: 12000,
    transition: 'fade',
    layout: 'three-zone',
    media: MEDIA_CONFIG,

    /**
     * @param {HTMLElement} element
     * @param {Object} context
     */
    render(element, context) {
      const { animationEngine } = context;

      element.classList.add('contact');

      // Phase 16: admin-edited content (built-in text/media when none).
      const sc = getSceneContent(context, 'contact');

      // ------------------------------------------------------
      // BACKGROUND
      // Premium gradient + subtle particle field.
      // ------------------------------------------------------

      const background = document.createElement('div');
      background.className = 'contact__background';

      const particles = document.createElement('div');
      particles.className = 'contact__particles';

      const particlePositions = [
        { x: '10%', y: '18%', size: '4px', delay: '0s' },
        { x: '85%', y: '12%', size: '3px', delay: '-2.5s' },
        { x: '92%', y: '55%', size: '5px', delay: '-4.8s' },
        { x: '6%', y: '70%', size: '3px', delay: '-1.2s' },
        { x: '48%', y: '8%', size: '4px', delay: '-3.6s' },
        { x: '55%', y: '88%', size: '3px', delay: '-5.4s' },
      ];

      particlePositions.forEach((p) => {
        const dot = document.createElement('span');

        dot.className = 'contact__particle';

        dot.style.left = p.x;
        dot.style.top = p.y;
        dot.style.width = p.size;
        dot.style.height = p.size;
        dot.style.animationDelay = p.delay;

        // Existing AnimationEngine ambient motion.
        animationEngine.float(dot, true);

        particles.appendChild(dot);
      });

      background.appendChild(particles);

      // ------------------------------------------------------
      // LEFT — invitation copy
      // ------------------------------------------------------

      const content = document.createElement('div');
      content.className = 'contact__content';

      const label = document.createElement('p');
      label.className = 'contact__label';
      label.textContent = sc.text('label', 'CONTACT US');

      const heading = document.createElement('h1');
      heading.className = 'contact__heading';
      heading.textContent = sc.text('heading', "Let's Build Your Future Together");

      const body = document.createElement('p');
      body.className = 'contact__body';
      body.textContent = sc.text('body', BODY_COPY);

      content.append(label, heading, body);

      // ------------------------------------------------------
      // CENTRE — contact list
      // ------------------------------------------------------

      const contactList = document.createElement('div');
      contactList.className = 'contact__list';

      sc.list('contactRows', CONTACT_FIELDS, { variable: true }).forEach((field) => {
        const row = document.createElement('div');

        row.className = 'contact__list-row';
        if (field.id) row.dataset.fieldId = field.id;

        const mark = document.createElement('span');
        mark.className = 'contact__list-mark';

        const textGroup = document.createElement('div');
        textGroup.className = 'contact__list-text';

        const fieldLabel = document.createElement('span');
        fieldLabel.className = 'contact__list-label';
        fieldLabel.textContent = field.label;

        const fieldValue = document.createElement('span');
        fieldValue.className = 'contact__list-value';
        fieldValue.textContent = field.value;

        textGroup.append(fieldLabel, fieldValue);

        row.append(mark, textGroup);

        contactList.appendChild(row);
      });

      // ------------------------------------------------------
      // RIGHT — QR code + social media
      // ------------------------------------------------------

      const right = document.createElement('div');
      right.className = 'contact__right';

      const qrBlock = document.createElement('div');
      qrBlock.className = 'contact__qr';
      qrBlock.dataset.fieldId = QR_ASSET.id;

      const qrBox = document.createElement('div');
      qrBox.className = 'contact__qr-box';

      const qrImage = document.createElement('img');
      qrImage.className = 'contact__qr-image';
      qrImage.src = sc.mediaSrc('qrCode', QR_ASSET.placeholderFile);
      qrImage.alt = QR_ASSET.description;

      /**
       * Graceful fallback if the QR PNG is missing.
       */
      qrImage.onerror = () => {
        qrImage.remove();
        qrBox.classList.add('contact__qr-box--fallback');
        qrBox.textContent = 'QR CODE';
      };

      qrBox.appendChild(qrImage);

      const qrLabel = document.createElement('p');
      qrLabel.className = 'contact__qr-label';
      qrLabel.textContent = sc.text('qrLabel', QR_ASSET.label);

      qrBlock.append(qrBox, qrLabel);

      // ------------------------------------------------------
      // SOCIAL MEDIA
      // ------------------------------------------------------

      const socialBlock = document.createElement('div');
      socialBlock.className = 'contact__social';

      sc.list('socialLinks', SOCIAL_LINKS, { variable: true }).forEach((link) => {
        const row = document.createElement('div');

        row.className = 'contact__social-row';
        if (link.id) row.dataset.linkId = link.id;

        const mark = document.createElement('span');
        mark.className = 'contact__social-mark';

        const labelEl = document.createElement('span');
        labelEl.className = 'contact__social-label';
        labelEl.textContent = link.label;

        row.append(mark, labelEl);

        socialBlock.appendChild(row);
      });

      right.append(qrBlock, socialBlock);

      // ------------------------------------------------------
      // COMPOSE SCENE
      // ------------------------------------------------------

      element.append(
        background,
        content,
        contactList,
        right
      );

      // ------------------------------------------------------
      // ANIMATION TIMELINE
      //
      // Every major section occupies its own dedicated zone,
      // therefore each enters once and remains visible.
      // ------------------------------------------------------

      clearTimers();

      const revealOnce = (animationPromise, el) =>
        animationPromise.then(() => {
          el.style.opacity = '1';
        });

      schedule(
        800,
        () => revealOnce(animationEngine.fade(label, 'in'), label)
      );

      schedule(
        1400,
        () =>
          revealOnce(
            animationEngine.slide(heading, 'in', 'up'),
            heading
          )
      );

      schedule(
        2200,
        () => revealOnce(animationEngine.fade(body, 'in'), body)
      );

      schedule(
        3000,
        () =>
          revealOnce(
            animationEngine.fade(contactList, 'in'),
            contactList
          )
      );

      schedule(
        4000,
        () =>
          revealOnce(
            animationEngine.scale(qrBlock, 'in'),
            qrBlock
          )
      );

      schedule(
        5000,
        () =>
          revealOnce(
            animationEngine.fade(socialBlock, 'in'),
            socialBlock
          )
      );

      // 6.0s–11.0s
      // Stable hold. The complete contact composition remains
      // visible while particles continue their subtle ambient
      // movement.
      //
      // 12.0s
      // SceneEngine handles the final dissolve into the loop.
    },

    /**
     * Cancels any timeline steps still pending if the scene
     * exits before its natural 12s duration completes.
     */
    cleanup() {
      clearTimers();
    },
  });
}