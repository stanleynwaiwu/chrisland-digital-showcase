/* ============================================================
   JS/SCENE-CONTENT.JS
   Phase 16 — admin-edited content for the ten original scenes.

   The scenes keep their current text and media paths as BUILT-IN
   DEFAULTS. This helper only answers "is there a stored edit for
   this item?" and otherwise hands back the default, so a scene
   looks exactly as before when there are no edits, when the backend
   is offline, or when anything in the stored data is malformed.

   - Text is plain text. Scenes must write it with textContent only
     (never innerHTML).
   - Media is kept apart from text, as a reference per slot:
       absent            -> original built-in file
       {path, type}      -> the uploaded file (backend /uploads/scenes/...)
       {removed: true}   -> no media: a source that cannot load, so the
                            scene's own existing fallback runs
   - Everything is read at RENDER time from the live store that
     js/app.js refreshes, so scenes need no re-registration.
   ============================================================ */

const SAFE_PATH_RE = /^scenes\/(image|video)-\d+-[a-f0-9]{32}\.(jpg|png|webp|gif|mp4|webm)$/;

// An image/video source that always fails to load, which makes the scene run
// the same onerror fallback it already has for a missing file.
const UNAVAILABLE_SRC = 'data:,';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * @param {{settings?: object}|null|undefined} context the scene's render context
 * @param {string} sceneId
 */
export function getSceneContent(context, sceneId) {
  const dynamic = context?.settings?.dynamicData;
  const stored = dynamic?.sceneContent?.[sceneId];
  const text = isObject(stored?.text) ? stored.text : {};
  const lists = isObject(stored?.lists) ? stored.lists : {};
  const media = isObject(stored?.media) ? stored.media : {};
  const origin = typeof dynamic?.backendOrigin === 'string' ? dynamic.backendOrigin.replace(/\/+$/, '') : '';

  const uploaded = (slot) => {
    const ref = media[slot];
    if (!isObject(ref) || typeof ref.path !== 'string' || !SAFE_PATH_RE.test(ref.path) || !origin) return null;
    if (ref.type !== 'image' && ref.type !== 'video') return null;
    if (!ref.path.includes(`/${ref.type}-`)) return null;
    return { src: `${origin}/uploads/${ref.path}`, type: ref.type };
  };

  return {
    /** Stored text for `key`, else `fallback`. */
    text(key, fallback) {
      const v = text[key];
      return typeof v === 'string' && v.trim() !== '' ? v : fallback;
    },

    /**
     * Stored list for `key`, else `defaults`. Items are merged over the default
     * item at the same position, so a missing field keeps its built-in text.
     * A fixed-count list whose stored length differs from the default is ignored.
     */
    list(key, defaults, { variable = false } = {}) {
      const stored = lists[key];
      if (!Array.isArray(stored)) return defaults;
      if (!variable && stored.length !== defaults.length) return defaults;
      if (variable && stored.length > 12) return defaults;
      return stored
        .filter(isObject)
        .map((item, i) => {
          const merged = variable ? {} : { ...(defaults[i] ?? {}) };
          Object.keys(item).forEach((k) => {
            if (typeof item[k] === 'string' && item[k].trim() !== '') merged[k] = item[k];
          });
          return merged;
        });
    },

    /** Source URL for a media slot: uploaded file, "unavailable" (removed), or `fallbackSrc`. */
    mediaSrc(slot, fallbackSrc) {
      const ref = media[slot];
      if (isObject(ref) && ref.removed === true) return UNAVAILABLE_SRC;
      const up = uploaded(slot);
      return up ? up.src : fallbackSrc;
    },

    /** 'image' | 'video' for a slot that accepts both (uploaded type, else `fallbackType`). */
    mediaType(slot, fallbackType) {
      const up = uploaded(slot);
      return up ? up.type : fallbackType;
    },
  };
}
