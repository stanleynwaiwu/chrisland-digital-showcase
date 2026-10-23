/* ============================================================
   ADMIN/JS/MEDIA-FIELD.JS
   Phase 15 — the optional image/video control shared by the News
   and Updates forms.

   What it does
   - Lets the admin choose an image or video, shows a preview of the
     selected file (or of the item's existing media), and lets them
     replace it, clear the selection, or remove the existing media.
   - Checks type and size in the browser first (same allowlist and
     limits as the server, backend/lib/media.js — the server is still
     the authority and re-checks the file's real contents).
   - Presentation choices stored on the record: how the media is
     fitted (`cover` / `contain`) and the slide layout
     (`split` = text + media, `full` = media-focused).

   What it does NOT do: save anything by itself. The page's submit
   handler saves the record first, then calls commit(id), which
   uploads the file (PUT /api/<kind>/:id/media) or removes the
   existing media (DELETE) — so a failed record save never uploads a
   file, and a failed upload on a NEW record rolls the record back
   (see the pages).
   ============================================================ */

import { adminFetchJSON } from './admin-shell.js';

const MB = 1024 * 1024;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm'];
const MAX_IMAGE_BYTES = 10 * MB; // keep in step with backend/lib/media.js
const MAX_VIDEO_BYTES = 100 * MB;
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

const SAFE_PATH_RE = /^(news|updates|scenes)\/(image|video)-\d+-[a-f0-9]{32}\.(jpg|png|webp|gif|mp4|webm)$/;

/** @param {string|null|undefined} path stored relative path @returns {string|null} same-origin URL, or null if not a generated media path */
export function mediaUrl(path) {
  return typeof path === 'string' && SAFE_PATH_RE.test(path) ? `/uploads/${path}` : null;
}

function extensionOf(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Browser-side check of a chosen file. Returns a message, or null if acceptable.
 * @param {File} file
 * @returns {string|null}
 */
export function validateMediaFile(file) {
  const ext = extensionOf(file.name);
  const isImage = IMAGE_EXTENSIONS.includes(ext);
  const isVideo = VIDEO_EXTENSIONS.includes(ext);
  if (!isImage && !isVideo) {
    return 'Unsupported file type. Use a JPG, PNG, WebP or GIF image, or an MP4 or WebM video.';
  }
  if (file.type && !/^(image|video)\//.test(file.type)) {
    return 'That file is not an image or video.';
  }
  if (file.size === 0) return 'That file is empty.';
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return `Image is too large (${(file.size / MB).toFixed(1)} MB). The limit is ${MAX_IMAGE_BYTES / MB} MB.`;
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return `Video is too large (${(file.size / MB).toFixed(1)} MB). The limit is ${MAX_VIDEO_BYTES / MB} MB.`;
  }
  return null;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Small thumbnail/label for the record list; null when the record has no (valid) media. */
export function buildMediaThumb(record) {
  const url = mediaUrl(record.image);
  if (!url || !record.mediaType) return null;
  const box = el('div', 'record-card__thumb');
  if (record.mediaType === 'image') {
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = url;
    img.addEventListener('error', () => {
      box.textContent = 'Missing';
      box.classList.add('record-card__thumb--missing');
    });
    box.append(img);
  } else {
    box.textContent = 'VIDEO';
    box.classList.add('record-card__thumb--video');
  }
  return box;
}

/**
 * @param {Object} options
 * @param {HTMLElement} options.root       container the control is built into
 * @param {'news'|'updates'} options.kind  which API collection the media belongs to
 */
export function createMediaField({ root, kind }) {
  let existing = null; // { path, type } of the saved media, or null
  let pendingFile = null;
  let pendingRemove = false;
  let objectUrl = null;

  root.classList.add('media-field');
  root.innerHTML = '';

  const label = el('label', null, 'Media (optional)');
  label.htmlFor = `${kind}-media-input`;

  const input = el('input');
  input.type = 'file';
  input.id = `${kind}-media-input`;
  input.accept = ACCEPT;

  const hint = el(
    'p',
    'form-field__hint',
    `JPG, PNG, WebP or GIF up to ${MAX_IMAGE_BYTES / MB} MB; MP4 or WebM up to ${MAX_VIDEO_BYTES / MB} MB. Videos play muted on the display.`
  );

  const preview = el('div', 'media-field__preview');
  preview.hidden = true;
  const note = el('p', 'media-field__note');
  note.setAttribute('role', 'status');

  const actions = el('div', 'media-field__actions');
  const removeButton = el('button', 'admin-button admin-button--ghost', 'Remove media');
  removeButton.type = 'button';
  const undoButton = el('button', 'admin-button admin-button--ghost', 'Keep current media');
  undoButton.type = 'button';
  const clearButton = el('button', 'admin-button admin-button--ghost', 'Clear selection');
  clearButton.type = 'button';
  actions.append(removeButton, undoButton, clearButton);

  const options = el('div', 'media-field__options');
  const fitWrap = el('div', 'form-field');
  const fitLabel = el('label', null, 'Media fit');
  fitLabel.htmlFor = `${kind}-media-fit`;
  const fitSelect = el('select');
  fitSelect.id = `${kind}-media-fit`;
  fitSelect.innerHTML =
    '<option value="cover">Fill the frame (crops edges)</option><option value="contain">Show whole picture (may letterbox)</option>';
  fitWrap.append(fitLabel, fitSelect);

  const layoutWrap = el('div', 'form-field');
  const layoutLabel = el('label', null, 'Slide layout');
  layoutLabel.htmlFor = `${kind}-media-layout`;
  const layoutSelect = el('select');
  layoutSelect.id = `${kind}-media-layout`;
  layoutSelect.innerHTML =
    '<option value="split">Text with media beside it</option><option value="full">Media-focused (text over media)</option>';
  layoutWrap.append(layoutLabel, layoutSelect);
  options.append(fitWrap, layoutWrap);

  root.append(label, input, hint, preview, note, actions, options);

  function revokeObjectUrl() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }

  function showPreview(url, type, caption) {
    preview.innerHTML = '';
    preview.hidden = false;
    let node;
    if (type === 'video') {
      node = el('video');
      node.muted = true;
      node.controls = true;
      node.preload = 'metadata';
      node.playsInline = true;
    } else {
      node = el('img');
      node.alt = 'Media preview';
    }
    node.addEventListener('error', () => {
      preview.innerHTML = '';
      preview.append(el('p', 'media-field__missing', 'Preview unavailable — the file is missing or could not be read.'));
    });
    node.src = url;
    preview.append(node);
    if (caption) preview.append(el('p', 'media-field__caption', caption));
  }

  function render() {
    revokeObjectUrl();
    preview.innerHTML = '';
    preview.hidden = true;
    note.textContent = '';
    note.classList.remove('media-field__note--error');

    let hasMedia = false;
    if (pendingFile) {
      hasMedia = true;
      objectUrl = URL.createObjectURL(pendingFile);
      const type = VIDEO_EXTENSIONS.includes(extensionOf(pendingFile.name)) ? 'video' : 'image';
      showPreview(objectUrl, type, `${pendingFile.name} — ${(pendingFile.size / MB).toFixed(1)} MB (will be uploaded when you save)`);
      if (existing) note.textContent = 'This will replace the current media when you save.';
    } else if (existing && !pendingRemove) {
      hasMedia = true;
      showPreview(mediaUrl(existing.path), existing.type, 'Current media');
    } else if (existing && pendingRemove) {
      note.textContent = 'The current media will be removed when you save.';
    }

    removeButton.hidden = !(existing && !pendingRemove && !pendingFile);
    undoButton.hidden = !(existing && pendingRemove && !pendingFile);
    clearButton.hidden = !pendingFile;
    options.hidden = !hasMedia;
  }

  function showError(message) {
    note.textContent = message;
    note.classList.add('media-field__note--error');
  }

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const problem = validateMediaFile(file);
    if (problem) {
      input.value = '';
      pendingFile = null;
      render();
      showError(problem);
      return;
    }
    pendingFile = file;
    pendingRemove = false;
    render();
  });

  removeButton.addEventListener('click', () => {
    pendingRemove = true;
    render();
  });
  undoButton.addEventListener('click', () => {
    pendingRemove = false;
    render();
  });
  clearButton.addEventListener('click', () => {
    pendingFile = null;
    input.value = '';
    render();
  });

  render();

  return {
    /** Back to an empty, no-media state (new item). */
    reset() {
      existing = null;
      pendingFile = null;
      pendingRemove = false;
      input.value = '';
      fitSelect.value = 'cover';
      layoutSelect.value = 'split';
      render();
    },

    /** Shows an existing record's saved media and presentation choices. */
    load(record) {
      existing = mediaUrl(record.image) && record.mediaType ? { path: record.image, type: record.mediaType } : null;
      pendingFile = null;
      pendingRemove = false;
      input.value = '';
      fitSelect.value = record.mediaFit === 'contain' ? 'contain' : 'cover';
      layoutSelect.value = record.mediaLayout === 'full' ? 'full' : 'split';
      render();
    },

    /** @returns {string|null} a problem with the current selection, or null */
    validate() {
      if (pendingFile) {
        const problem = validateMediaFile(pendingFile);
        if (problem) {
          showError(problem);
          return problem;
        }
      }
      return null;
    },

    /** True when saving needs an upload or a removal. */
    hasChange() {
      return Boolean(pendingFile) || (pendingRemove && Boolean(existing));
    },
    hasFile() {
      return Boolean(pendingFile);
    },
    describeChange() {
      return pendingFile ? (VIDEO_EXTENSIONS.includes(extensionOf(pendingFile.name)) ? 'Uploading video…' : 'Uploading image…') : 'Removing media…';
    },

    getFit: () => fitSelect.value,
    getLayout: () => layoutSelect.value,

    /**
     * Applies the pending upload/removal to a saved record.
     * Throws (with a readable message) on failure; the record's text is
     * already saved by then.
     * @param {number} id
     * @returns {Promise<void>}
     */
    async commit(id) {
      if (pendingFile) {
        await adminFetchJSON(`/api/${kind}/${id}/media`, {
          method: 'PUT',
          headers: { 'Content-Type': pendingFile.type || 'application/octet-stream' },
          body: pendingFile,
        });
      } else if (pendingRemove && existing) {
        await adminFetchJSON(`/api/${kind}/${id}/media`, { method: 'DELETE' });
      }
    },
  };
}
