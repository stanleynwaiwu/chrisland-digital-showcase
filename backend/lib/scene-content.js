/**
 * Phase 16 — stored edits to the ten original scenes' content.
 *
 * One row per scene in `scene_content` (created by `npm run migrate`):
 *   content_json = {
 *     text:  { <fieldKey>: "string", ... },          only fields that differ from the built-in text
 *     lists: { <listKey>: [ {<itemKey>: "string"} ] }, a whole list, only when it differs
 *     media: { <slot>: {path, type} | {removed:true} } media is kept apart from the text
 *   }
 * A scene with no row (or a missing key) simply shows its built-in content, so
 * the display never depends on this table existing. `media` is a map of slot ->
 * reference on purpose: a slot can later hold a list of references without
 * touching the text or the scenes' text handling.
 *
 * All values are plain text. They are validated against the whitelist in
 * scene-content-schema.js; nothing is ever interpreted as HTML (the display
 * and the admin write them with textContent / .value only).
 */
const db = require('../db/database');
const { SCENES, getSceneSchema } = require('./scene-content-schema');
const { isSafeMediaPath } = require('./media');

class ContentError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Collapses whitespace/newlines, strips control characters, trims. */
function cleanText(value, label, max) {
  if (typeof value !== 'string') throw new ContentError(`${label} must be text.`);
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if ([...text].length > max) throw new ContentError(`${label} is too long (limit ${max} characters).`);
  return text;
}

function tableExists() {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='scene_content'").get());
}

/** @returns {{text:object, lists:object, media:object}} */
function emptyContent() {
  return { text: {}, lists: {}, media: {} };
}

function parseRow(json) {
  try {
    const parsed = JSON.parse(json);
    if (!isPlainObject(parsed)) return emptyContent();
    return {
      text: isPlainObject(parsed.text) ? parsed.text : {},
      lists: isPlainObject(parsed.lists) ? parsed.lists : {},
      media: isPlainObject(parsed.media) ? parsed.media : {},
    };
  } catch {
    return emptyContent();
  }
}

/** @returns {{text:object, lists:object, media:object}} stored overrides ({} parts when none) */
function getStoredContent(sceneId) {
  if (!tableExists()) return emptyContent();
  const row = db.prepare('SELECT content_json FROM scene_content WHERE scene_id = ?').get(sceneId);
  return row ? parseRow(row.content_json) : emptyContent();
}

function saveContent(sceneId, content) {
  const empty =
    !Object.keys(content.text).length && !Object.keys(content.lists).length && !Object.keys(content.media).length;
  if (empty) {
    db.prepare('DELETE FROM scene_content WHERE scene_id = ?').run(sceneId);
    return;
  }
  db.prepare(
    `INSERT INTO scene_content (scene_id, content_json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(scene_id) DO UPDATE SET content_json = excluded.content_json, updated_at = datetime('now')`
  ).run(sceneId, JSON.stringify(content));
}

const sameItems = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Validates an admin submission of {text, lists} for one scene and returns the
 * overrides to store (values equal to the built-in default are dropped, and an
 * empty value means "use the built-in text").
 */
function validateTextAndLists(schema, body) {
  if (!isPlainObject(body)) throw new ContentError('Request body must be an object.');
  const { text = {}, lists = {} } = body;
  if (!isPlainObject(text) || !isPlainObject(lists)) throw new ContentError('`text` and `lists` must be objects.');
  Object.keys(body).forEach((k) => {
    if (k !== 'text' && k !== 'lists') throw new ContentError(`Unknown property "${k}".`);
  });

  const outText = {};
  Object.keys(text).forEach((key) => {
    const field = schema.fields.find((x) => x.key === key);
    if (!field) throw new ContentError(`"${key}" is not an editable field of this scene.`);
    const value = cleanText(text[key], field.label, field.max);
    if (value !== '' && value !== field.default) outText[key] = value;
  });

  const outLists = {};
  Object.keys(lists).forEach((key) => {
    const spec = schema.lists.find((x) => x.key === key);
    if (!spec) throw new ContentError(`"${key}" is not an editable list of this scene.`);
    const items = lists[key];
    if (!Array.isArray(items)) throw new ContentError(`${spec.label} must be a list.`);
    if (spec.variable) {
      if (items.length < spec.min || items.length > spec.max) {
        throw new ContentError(`${spec.label} must have between ${spec.min} and ${spec.max} items.`);
      }
    } else if (items.length !== spec.defaults.length) {
      throw new ContentError(`${spec.label} must keep exactly ${spec.defaults.length} items.`);
    }
    const cleaned = items.map((item, index) => {
      if (!isPlainObject(item)) throw new ContentError(`${spec.label} item ${index + 1} is invalid.`);
      Object.keys(item).forEach((k) => {
        if (!spec.itemFields.some((fld) => fld.key === k)) {
          throw new ContentError(`"${k}" is not a field of ${spec.label}.`);
        }
      });
      const out = {};
      spec.itemFields.forEach((fld) => {
        const fallback = !spec.variable ? spec.defaults[index][fld.key] : '';
        const raw = Object.prototype.hasOwnProperty.call(item, fld.key) ? item[fld.key] : fallback;
        let value = cleanText(raw, `${spec.label} item ${index + 1} — ${fld.label}`, fld.max);
        if (value === '' && !spec.variable) value = fallback; // fixed lists: empty -> built-in text
        if (value === '' && spec.variable && fld.key === spec.itemFields[0].key) {
          throw new ContentError(`${spec.label} item ${index + 1} needs a ${fld.label.toLowerCase()}.`);
        }
        out[fld.key] = value;
      });
      return out;
    });
    if (spec.lineBudget) {
      const { field, charsPerLine, totalLines } = spec.lineBudget;
      const lines = cleaned.reduce((sum, c) => sum + Math.max(1, Math.ceil([...c[field]].length / charsPerLine)), 0);
      if (lines > totalLines) {
        throw new ContentError(
          `${spec.label}: the ${field}s are too long to fit the screen together (long ones wrap onto extra lines; keep most under ${charsPerLine} characters).`
        );
      }
    }
    if (!sameItems(cleaned, spec.defaults)) outLists[key] = cleaned;
  });

  return { text: outText, lists: outLists };
}

/** Replaces the scene's text + lists overrides; media references are kept. */
function setTextAndLists(sceneId, body) {
  const schema = getSceneSchema(sceneId);
  const { text, lists } = validateTextAndLists(schema, body);
  const current = getStoredContent(sceneId);
  saveContent(sceneId, { text, lists, media: current.media });
  return getStoredContent(sceneId);
}

/** Only references that are safe generated paths and belong to a real slot. */
function cleanMedia(schema, media) {
  const out = {};
  Object.keys(media).forEach((slot) => {
    const spec = schema.media.find((m) => m.slot === slot);
    const ref = media[slot];
    if (!spec || !isPlainObject(ref)) return;
    if (ref.removed === true) out[slot] = { removed: true };
    else if (isSafeMediaPath(ref.path) && spec.accepts.includes(ref.type)) out[slot] = { path: ref.path, type: ref.type };
  });
  return out;
}

/** Sets (ref) or clears (null) one media slot; returns the previous reference. */
function setMediaRef(sceneId, slot, ref) {
  const current = getStoredContent(sceneId);
  const previous = current.media[slot] || null;
  const media = { ...current.media };
  if (ref === null) delete media[slot];
  else media[slot] = ref;
  saveContent(sceneId, { text: current.text, lists: current.lists, media });
  return previous;
}

/** Removes every override for a scene; returns the media references that were stored. */
function resetScene(sceneId) {
  const current = getStoredContent(sceneId);
  saveContent(sceneId, emptyContent());
  return Object.values(current.media);
}

/** Admin view of one scene: schema + built-in defaults + stored overrides. */
function describeScene(sceneId) {
  const schema = getSceneSchema(sceneId);
  const stored = getStoredContent(sceneId);
  return {
    id: schema.id,
    label: schema.label,
    fields: schema.fields,
    lists: schema.lists,
    media: schema.media,
    values: { text: stored.text, lists: stored.lists, media: cleanMedia(schema, stored.media) },
  };
}

/**
 * Public payload field: { [sceneId]: {text, lists, media} } for scenes that have
 * stored overrides. Never throws — a missing table or bad row yields no override.
 */
function getPublicSceneContent() {
  const out = {};
  try {
    if (!tableExists()) return out;
    db.prepare('SELECT scene_id, content_json FROM scene_content').all().forEach((row) => {
      const schema = getSceneSchema(row.scene_id);
      if (!schema) return;
      const stored = parseRow(row.content_json);
      out[row.scene_id] = { text: stored.text, lists: stored.lists, media: cleanMedia(schema, stored.media) };
    });
  } catch (err) {
    console.error('[scene-content] could not read overrides:', err.message);
  }
  return out;
}

module.exports = {
  SCENES,
  ContentError,
  tableExists,
  getStoredContent,
  setTextAndLists,
  setMediaRef,
  resetScene,
  describeScene,
  getPublicSceneContent,
};
