/* ============================================================
   ADMIN/JS/SCENE-LABELS.JS
   Phase 12 — human-readable display names for scene ids, used only
   by the admin panel (Dashboard + Presentation Manager). The
   presentation itself is untouched by this file; it is purely an
   admin-UI concern layered on top of the existing scene ids already
   returned by GET /api/scenes.
   ============================================================ */

export const SCENE_LABELS = {
  'opening-logo': 'Opening Logo',
  'welcome-scene': 'Welcome',
  'vision-mission-values': 'Vision, Mission & Values',
  'campus-experience': 'Campus Experience',
  'academic-programmes': 'Academic Programmes',
  'student-life': 'Student Life',
  'research-innovation': 'Research & Innovation',
  'graduate-success': 'Graduate Success',
  admissions: 'Admissions',
  contact: 'Contact',
  'latest-updates': 'Latest Updates',
  'latest-news': 'Latest News',
};

/**
 * @param {string} id
 * @returns {string} a human-readable label, falling back to the
 *   raw id for any scene added later that this map doesn't know
 *   about yet — so the Presentation Manager never breaks on an
 *   unrecognized id.
 */
export function sceneLabel(id) {
  return SCENE_LABELS[id] || id;
}
