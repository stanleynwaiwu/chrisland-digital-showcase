/* ============================================================
   SCENES/LATEST-UPDATES.JS
   Phase 11 introduced this scene; Phase 14 changed how it shows
   its content.

   Still ONE registered scene, still entirely data-driven from the
   backend's `updates` table (via GET /api/presentation ->
   settings.dynamicData.updates). Each eligible update now gets its
   OWN full slide for its OWN configured duration (durationMs), and
   the scene's length is the sum of those durations. The sequencing
   machinery lives in js/dynamic-scene.js / js/dynamic-sequence.js;
   this file only defines what one update's slide looks like.

   A section with no eligible updates is not registered into the
   rotation at all (js/app.js), so there is no empty-state slide.
   ============================================================ */

import { registerDynamicSection, sizeBucket } from '../js/dynamic-scene.js';
import { attachMedia } from '../js/dynamic-media.js';

const HEADLINE_LIMITS = [40, 80, 140];
const BODY_LIMITS = [140, 280, 420];

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * One update's slide. `title` is nullable in the schema (legacy
 * announcements have none): without a title the summary itself is
 * the headline; with one, the summary becomes the supporting body.
 */
function buildUpdateSlide(update, index, total, settings) {
  const priority = ['low', 'normal', 'high'].includes(update.priority) ? update.priority : 'normal';
  const hasTitle = Boolean(update.title && update.title.trim());
  const headlineText = hasTitle ? update.title : update.summary;

  const slide = el('article', `dyn-slide--update dyn-slide--priority-${priority}`);

  const eyebrow = el('header', 'dyn-slide__eyebrow');
  eyebrow.append(el('span', 'dyn-slide__kicker', 'LATEST UPDATE'));
  if (priority === 'high') eyebrow.append(el('span', 'dyn-slide__tag', 'PRIORITY'));

  const headline = el('h2', 'dyn-slide__headline', headlineText);
  headline.dataset.size = sizeBucket(headlineText, HEADLINE_LIMITS);

  slide.append(eyebrow, headline);

  if (hasTitle) {
    const body = el('p', 'dyn-slide__body', update.summary);
    body.dataset.size = sizeBucket(update.summary, BODY_LIMITS);
    slide.append(body);
  }

  // Phase 15: optional image/video (falls back to text-only on any problem).
  attachMedia(slide, update, settings?.dynamicData?.backendOrigin);

  return slide;
}

/**
 * Registers the Latest Updates scene against a SceneEngine.
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 * @param {{isPaused?: () => boolean, requestAdvance?: (sceneId: string) => void}} [hooks]
 */
export function registerLatestUpdatesScene(sceneEngine, hooks = {}) {
  registerDynamicSection(sceneEngine, hooks, {
    id: 'latest-updates',
    name: 'Latest Updates',
    transition: { type: 'reveal', direction: 'up' },
    layout: 'sequence',
    rootClass: 'latest-updates-scene',
    getRawItems: (settings) => settings?.dynamicData?.updates ?? [],
    buildSlide: buildUpdateSlide,
  });
}
