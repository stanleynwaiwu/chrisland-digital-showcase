/**
 * Shared scene_config helpers — used by routes/presentation.js
 * (read-only, for the public payload's `scenes` array) and
 * routes/scenes.js (read + write, for the admin panel's Scene
 * Manager). Extracted here following the same pattern as
 * lib/settings.js, so the query/shape used by the public payload
 * and the admin API can never drift apart.
 *
 * Scene rows are never created or deleted through this API — the
 * set of valid scene ids is fixed by the code-defined scenes and
 * seeded once by db/migrate.js (EXISTING_SCENES). This API only
 * updates enabled / sort_order / duration_override_ms on existing
 * rows.
 */
const db = require('../db/database');

/**
 * @returns {Array<{id: string, enabled: boolean, sortOrder: number, durationOverrideMs: number|null}>}
 */
function getSceneConfigList() {
  return db
    .prepare(
      `SELECT id, enabled, sort_order AS sortOrder, duration_override_ms AS durationOverrideMs
       FROM scene_config
       ORDER BY sort_order ASC`
    )
    .all()
    .map((row) => ({ ...row, enabled: Boolean(row.enabled) }));
}

/** @param {string} id @returns {boolean} */
function sceneExists(id) {
  return Boolean(db.prepare('SELECT 1 FROM scene_config WHERE id = ?').get(id));
}

/**
 * Updates one scene's config row. Caller (routes/scenes.js) is
 * responsible for validating the shape/types of `fields` before
 * calling this — this function assumes it has already been
 * validated and only decides which columns to touch based on which
 * keys are present.
 *
 * @param {string} id
 * @param {{enabled?: boolean, sortOrder?: number, durationOverrideMs?: number|null}} fields
 * @returns {boolean} whether a row was updated
 */
function updateSceneConfig(id, fields) {
  const sets = [];
  const params = [];

  if (Object.prototype.hasOwnProperty.call(fields, 'enabled')) {
    sets.push('enabled = ?');
    params.push(fields.enabled ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'sortOrder')) {
    sets.push('sort_order = ?');
    params.push(fields.sortOrder);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'durationOverrideMs')) {
    sets.push('duration_override_ms = ?');
    params.push(fields.durationOverrideMs);
  }

  if (sets.length === 0) return false;

  sets.push("updated_at = datetime('now')");
  params.push(id);

  const result = db
    .prepare(`UPDATE scene_config SET ${sets.join(', ')} WHERE id = ?`)
    .run(...params);

  return result.changes > 0;
}

module.exports = { getSceneConfigList, sceneExists, updateSceneConfig };
