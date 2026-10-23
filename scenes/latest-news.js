/* ============================================================
   SCENES/LATEST-NEWS.JS
   Phase 11 introduced this scene; Phase 14 changed how it shows
   its content.

   Still ONE registered scene, still entirely data-driven from the
   backend's `news` table (via GET /api/presentation ->
   settings.dynamicData.news). Each eligible news item now gets its
   OWN full slide for its OWN configured duration (durationMs), and
   the scene's length is the sum of those durations. The sequencing
   machinery lives in js/dynamic-scene.js / js/dynamic-sequence.js;
   this file only defines what one news item's slide looks like.

   Phase 15: an item may carry an image or video (js/dynamic-media.js);
   without one, or if it fails to load, the slide is text-only.

   A section with no eligible items is not registered into the
   rotation at all (js/app.js), so there is no empty-state slide.
   ============================================================ */

import { registerDynamicSection, sizeBucket } from '../js/dynamic-scene.js';
import { attachMedia } from '../js/dynamic-media.js';

const HEADLINE_LIMITS = [40, 80, 140];
const BODY_LIMITS = [140, 280, 420];

const publishedFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC', // publishedAt is a plain calendar date; format it without any zone shift
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatPublished(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : publishedFormat.format(date);
}

/** One news item's slide: category, headline, summary, optional longer content. */
function buildNewsSlide(item, index, total, settings) {
  const slide = el('article', 'dyn-slide--news');

  const eyebrow = el('header', 'dyn-slide__eyebrow');
  eyebrow.append(el('span', 'dyn-slide__kicker', 'LATEST NEWS'));
  if (item.category) eyebrow.append(el('span', 'dyn-slide__tag', item.category));

  const headline = el('h2', 'dyn-slide__headline', item.title);
  headline.dataset.size = sizeBucket(item.title, HEADLINE_LIMITS);

  const summary = el('p', 'dyn-slide__body', item.summary);
  summary.dataset.size = sizeBucket(item.summary, BODY_LIMITS);

  slide.append(eyebrow, headline, summary);

  if (item.content && item.content.trim()) {
    const detail = el('p', 'dyn-slide__detail', item.content);
    detail.dataset.size = sizeBucket(item.content, [200, 400, 700]);
    slide.append(detail);
  }

  const footer = el('footer', 'dyn-slide__footer');
  const published = item.publishedAt ? formatPublished(item.publishedAt) : null;
  if (published) footer.append(el('span', 'dyn-slide__date', published));
  if (footer.childElementCount > 0) slide.append(footer);

  // Phase 15: optional image/video (falls back to text-only on any problem).
  attachMedia(slide, item, settings?.dynamicData?.backendOrigin);

  return slide;
}

/**
 * Registers the Latest News scene against a SceneEngine.
 * @param {import('../js/scene-engine.js').SceneEngine} sceneEngine
 * @param {{isPaused?: () => boolean, requestAdvance?: (sceneId: string) => void}} [hooks]
 */
export function registerLatestNewsScene(sceneEngine, hooks = {}) {
  registerDynamicSection(sceneEngine, hooks, {
    id: 'latest-news',
    name: 'News',
    transition: { type: 'blur', direction: 'center' },
    layout: 'sequence',
    rootClass: 'latest-news-scene',
    getRawItems: (settings) => settings?.dynamicData?.news ?? [],
    buildSlide: buildNewsSlide,
  });
}
