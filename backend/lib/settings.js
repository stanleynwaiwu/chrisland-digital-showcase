/**
 * Shared settings helpers — used by routes/presentation.js (read-
 * only, for the public payload) and routes/settings.js (read +
 * write, for the admin panel). Extracted here in Phase 8 so the
 * key-to-nested-object flattening logic exists in exactly one
 * place rather than being duplicated between the two routes.
 * getSettingsNested()'s behaviour is identical to the getSettings()
 * it replaces in presentation.js — same query, same flattening.
 */
const db = require('../db/database');

/** Flattens the settings key/value rows into a nested object, e.g. 'contact.email' -> {contact: {email: ...}}. */
function getSettingsNested() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(({ key, value }) => {
    const [group, field] = key.split('.');
    if (!field) {
      settings[key] = value;
      return;
    }
    if (!settings[group]) settings[group] = {};
    settings[group][field] = value;
  });
  return settings;
}

/**
 * Upserts one key/value pair.
 * @param {string} key
 * @param {string} value
 */
function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, value);
}

/**
 * Upserts every key in a nested {group: {field: value}} object,
 * flattening back to 'group.field' — the inverse of
 * getSettingsNested(), for accepting the admin panel's PUT body.
 * @param {Record<string, Record<string, string>>} nested
 */
function setSettingsNested(nested) {
  Object.entries(nested || {}).forEach(([group, fields]) => {
    if (!fields || typeof fields !== 'object') return;
    Object.entries(fields).forEach(([field, value]) => {
      setSetting(`${group}.${field}`, String(value ?? ''));
    });
  });
}

module.exports = { getSettingsNested, setSetting, setSettingsNested };
