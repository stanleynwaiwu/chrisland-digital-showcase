/* ============================================================
   ADMIN/JS/SCENE-CONTENT-PAGE.JS
   Phase 16 — edit the wording and media of the ten built-in scenes.

   - One form per scene, built from what the API says that scene
     supports (GET /api/scene-content): text fields, lists, media slots.
     No scene shares a generic form.
   - Lists with a fixed count (the scene's timeline is built around it)
     can only be edited; Contact's lists can also add / remove / reorder.
   - All values go into inputs via .value and everything else via
     textContent — nothing the admin types is ever parsed as HTML.
   - Saving is "save and verify": the scene is re-read from the server
     afterwards and the form is rebuilt from what was actually stored.
   - Media uses the same upload endpoint pattern, allowlist and size
     limits as News/Updates (validateMediaFile from media-field.js).
   ============================================================ */

import { initAdminShell, adminFetchJSON } from './admin-shell.js';
import { validateMediaFile, mediaUrl } from './media-field.js';

const statusEl = document.getElementById('sc-status');
const listEl = document.getElementById('sc-scene-list');
const editorEl = document.getElementById('sc-editor');

let scenes = [];
let activeId = null;
let dirty = false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message, kind) {
  statusEl.hidden = !message;
  statusEl.textContent = message || '';
  statusEl.classList.toggle('presentation-status--success', kind === 'success');
  statusEl.classList.toggle('presentation-status--error', kind === 'error');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sceneById(id) {
  return scenes.find((s) => s.id === id);
}

function replaceScene(updated) {
  const index = scenes.findIndex((s) => s.id === updated.id);
  if (index !== -1) scenes[index] = updated;
}

/* ---------- scene list ---------- */

function renderSceneList() {
  listEl.innerHTML = '';
  scenes.forEach((scene) => {
    const button = el('button', 'admin-button admin-button--ghost', scene.label);
    button.type = 'button';
    if (scene.id === activeId) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => {
      if (scene.id === activeId) return;
      if (dirty && !window.confirm('You have unsaved text changes on this scene. Discard them?')) return;
      openScene(scene.id);
    });
    listEl.append(button);
  });
}

/* ---------- editor ---------- */

function openScene(id) {
  activeId = id;
  dirty = false;
  setStatus('');
  renderSceneList();
  renderEditor();
}

function renderEditor() {
  const scene = sceneById(activeId);
  editorEl.innerHTML = '';
  if (!scene) return;

  const draft = {
    text: {},
    lists: {},
  };
  scene.fields.forEach((f) => {
    draft.text[f.key] = scene.values.text[f.key] ?? f.default;
  });
  scene.lists.forEach((l) => {
    draft.lists[l.key] = clone(scene.values.lists[l.key] ?? l.defaults);
  });
  const markDirty = () => {
    dirty = true;
  };

  editorEl.append(el('h2', null, scene.label));

  /* text */
  if (scene.fields.length) {
    const section = el('div', 'sc-section');
    section.append(el('h3', null, 'Text'));
    const grid = el('div', 'sc-fields');
    scene.fields.forEach((f) => {
      grid.append(textField(`sc-${scene.id}-${f.key}`, f.label, f.max, draft.text[f.key], f.default, (v) => {
        draft.text[f.key] = v;
        markDirty();
      }));
    });
    section.append(grid);
    editorEl.append(section);
  }

  /* lists */
  scene.lists.forEach((spec) => {
    const section = el('div', 'sc-section');
    section.append(el('h3', null, spec.label));
    if (!spec.variable) {
      section.append(
        el('p', 'form-field__hint', `This scene shows exactly ${spec.defaults.length} items, so they can be edited but not added or removed.`)
      );
    }
    const holder = el('div');
    section.append(holder);
    const paint = () => renderList(holder, spec, draft.lists[spec.key], scene, markDirty, paint);
    paint();
    if (spec.variable) {
      const add = el('button', 'admin-button admin-button--ghost', 'Add item');
      add.type = 'button';
      add.addEventListener('click', () => {
        if (draft.lists[spec.key].length >= spec.max) {
          setStatus(`${spec.label} can have at most ${spec.max} items.`, 'error');
          return;
        }
        const blank = {};
        spec.itemFields.forEach((f) => {
          blank[f.key] = '';
        });
        draft.lists[spec.key].push(blank);
        markDirty();
        paint();
      });
      section.append(add);
      section.append(el('p', 'form-field__hint', `${spec.min}–${spec.max} items.${spec.lineBudget ? ` Keep most ${spec.lineBudget.field}s under ${spec.lineBudget.charsPerLine} characters: longer ones wrap onto a second line and the screen only has room for ${spec.lineBudget.totalLines} lines in total.` : ''}`));
    }
    editorEl.append(section);
  });

  /* save bar */
  const bar = el('div', 'sc-savebar');
  const save = el('button', 'admin-button admin-button--primary', 'Save text changes');
  save.type = 'button';
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const body = { text: draft.text, lists: draft.lists };
      const result = await adminFetchJSON(`/api/scene-content/${scene.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      replaceScene(result.scene);
      // Verify: re-read what the server actually stored and rebuild the form from it.
      const check = await adminFetchJSON(`/api/scene-content/${scene.id}`);
      replaceScene(check.scene);
      dirty = false;
      renderEditor();
      setStatus('Saved and re-read from the server. The display shows this the next time it refreshes or reloads.', 'success');
    } catch (err) {
      setStatus(err.message, 'error');
    } finally {
      save.disabled = false;
    }
  });
  const reset = el('button', 'admin-button admin-button--danger', 'Revert scene to original');
  reset.type = 'button';
  reset.addEventListener('click', async () => {
    if (!window.confirm(`Revert "${scene.label}" to its original text and media? Uploaded files for this scene will be deleted.`)) return;
    try {
      const result = await adminFetchJSON(`/api/scene-content/${scene.id}`, { method: 'DELETE' });
      replaceScene(result.scene);
      dirty = false;
      renderEditor();
      setStatus('Scene reverted to its original content.', 'success');
    } catch (err) {
      setStatus(err.message, 'error');
    }
  });
  bar.append(save, reset);
  editorEl.append(bar);

  /* media (acts immediately, separate from the text save) */
  if (scene.media.length) {
    const section = el('div', 'sc-section');
    section.append(el('h3', null, 'Pictures and videos'));
    section.append(
      el(
        'p',
        'form-field__hint',
        'Uploads, replacements and reverts take effect as soon as you click them (they do not wait for "Save text changes"). JPG, PNG, WebP, GIF up to 10 MB; MP4 or WebM up to 100 MB. Videos play muted.'
      )
    );
    scene.media.forEach((spec) => section.append(mediaBlock(scene, spec)));
    editorEl.append(section);
  }
}

function textField(id, label, max, value, def, onChange) {
  const wrap = el('div', 'form-field');
  const lab = el('label', null, label);
  lab.htmlFor = id;
  const long = max > 120;
  const input = el(long ? 'textarea' : 'input');
  if (long) input.rows = 3;
  else input.type = 'text';
  input.id = id;
  input.maxLength = max;
  input.value = value;
  const counter = el('span', 'sc-counter');
  const update = () => {
    counter.textContent = `${[...input.value].length}/${max}`;
  };
  update();
  input.addEventListener('input', () => {
    update();
    onChange(input.value);
  });
  wrap.append(lab, input, counter);
  if (def !== undefined && def !== '') wrap.title = `Original: ${def}`;
  return wrap;
}

function renderList(holder, spec, items, scene, markDirty, repaint) {
  holder.innerHTML = '';
  items.forEach((item, index) => {
    const card = el('div', 'sc-item');
    const head = el('div', 'sc-item__head');
    head.append(el('span', null, spec.itemNames?.[index] ?? `Item ${index + 1}`));
    if (spec.variable) {
      const actions = el('div', 'sc-item__actions');
      const mk = (text, title, fn, disabled) => {
        const b = el('button', 'admin-button admin-button--ghost', text);
        b.type = 'button';
        b.title = title;
        b.disabled = Boolean(disabled);
        b.addEventListener('click', fn);
        return b;
      };
      actions.append(
        mk('↑', 'Move up', () => {
          [items[index - 1], items[index]] = [items[index], items[index - 1]];
          markDirty();
          repaint();
        }, index === 0),
        mk('↓', 'Move down', () => {
          [items[index + 1], items[index]] = [items[index], items[index + 1]];
          markDirty();
          repaint();
        }, index === items.length - 1),
        mk('Remove', 'Remove this item', () => {
          if (items.length <= spec.min) {
            setStatus(`${spec.label} needs at least ${spec.min} item${spec.min === 1 ? '' : 's'}.`, 'error');
            return;
          }
          items.splice(index, 1);
          markDirty();
          repaint();
        })
      );
      head.append(actions);
    }
    card.append(head);
    const grid = el('div', 'sc-fields');
    spec.itemFields.forEach((f) => {
      grid.append(
        textField(`sc-${scene.id}-${spec.key}-${index}-${f.key}`, f.label, f.max, item[f.key] ?? '', spec.defaults[index]?.[f.key], (v) => {
          item[f.key] = v;
          markDirty();
        })
      );
    });
    card.append(grid);
    holder.append(card);
  });
}

/* ---------- media ---------- */

function mediaBlock(scene, spec) {
  const box = el('div', 'sc-media');
  box.append(el('strong', null, spec.label));
  const ref = scene.values.media[spec.slot];
  const url = ref && ref.path ? mediaUrl(ref.path) : null;
  const state = el(
    'p',
    'sc-media__state',
    ref && ref.removed ? 'Hidden — the scene shows its no-media fallback.' : url ? 'Custom file in use.' : 'Original built-in file in use.'
  );
  box.append(state);

  if (url) {
    const preview = el('div', 'sc-media__preview');
    let node;
    if (ref.type === 'video') {
      node = el('video');
      node.muted = true;
      node.controls = true;
      node.preload = 'metadata';
    } else {
      node = el('img');
      node.alt = `${spec.label} preview`;
    }
    node.addEventListener('error', () => {
      preview.textContent = 'Preview unavailable — the file is missing or unreadable.';
    });
    node.src = url;
    preview.append(node);
    box.append(preview);
  }

  const actions = el('div', 'sc-media__actions');
  const input = el('input');
  input.type = 'file';
  input.id = `sc-media-${scene.id}-${spec.slot}`;
  input.accept = spec.accepts
    .map((t) => (t === 'image' ? '.jpg,.jpeg,.png,.webp,.gif' : '.mp4,.webm'))
    .join(',');
  input.setAttribute('aria-label', `Choose a file for ${spec.label}`);
  const upload = el('button', 'admin-button admin-button--primary', url || (ref && ref.removed) ? 'Replace' : 'Upload');
  upload.type = 'button';
  const note = el('span', 'sc-counter');
  note.setAttribute('role', 'status');

  upload.addEventListener('click', async () => {
    const file = input.files && input.files[0];
    if (!file) {
      note.textContent = 'Choose a file first.';
      return;
    }
    const problem = validateMediaFile(file);
    if (problem) {
      note.textContent = problem;
      return;
    }
    const isVideo = /\.(mp4|webm)$/i.test(file.name);
    if (!spec.accepts.includes(isVideo ? 'video' : 'image')) {
      note.textContent = `This slot accepts ${spec.accepts.join(' or ')} only.`;
      return;
    }
    upload.disabled = true;
    note.textContent = 'Uploading…';
    try {
      const result = await adminFetchJSON(`/api/scene-content/${scene.id}/media/${spec.slot}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      refreshMedia(result.scene, 'Media uploaded.');
    } catch (err) {
      note.textContent = err.message;
      upload.disabled = false;
    }
  });
  actions.append(input, upload);

  if (url || (ref && ref.removed)) {
    const revert = el('button', 'admin-button admin-button--ghost', 'Revert to original');
    revert.type = 'button';
    revert.addEventListener('click', async () => {
      try {
        const result = await adminFetchJSON(`/api/scene-content/${scene.id}/media/${spec.slot}`, { method: 'DELETE' });
        refreshMedia(result.scene, 'Reverted to the original file.');
      } catch (err) {
        note.textContent = err.message;
      }
    });
    actions.append(revert);
  }
  if (!(ref && ref.removed)) {
    const hide = el('button', 'admin-button admin-button--ghost', 'Remove from scene');
    hide.type = 'button';
    hide.addEventListener('click', async () => {
      if (!window.confirm(`Remove "${spec.label}" from the scene? The scene will show its no-media fallback.`)) return;
      try {
        const result = await adminFetchJSON(`/api/scene-content/${scene.id}/media/${spec.slot}/hide`, { method: 'POST' });
        refreshMedia(result.scene, 'Media removed from the scene.');
      } catch (err) {
        note.textContent = err.message;
      }
    });
    actions.append(hide);
  }
  actions.append(note);
  box.append(actions);
  return box;
}

/** Applies a media change without losing unsaved text edits on the form. */
function refreshMedia(updatedScene, message) {
  const unsaved = dirty;
  const old = sceneById(updatedScene.id);
  if (unsaved && old) {
    // keep text values the admin has not saved yet: only the media part changes
    old.values.media = updatedScene.values.media;
    const section = editorEl.querySelectorAll('.sc-section');
    const mediaSection = section[section.length - 1];
    mediaSection.querySelectorAll('.sc-media').forEach((n) => n.remove());
    scenes.find((s) => s.id === old.id).media.forEach((spec) => mediaSection.append(mediaBlock(old, spec)));
  } else {
    replaceScene(updatedScene);
    renderEditor();
  }
  setStatus(message, 'success');
}

/* ---------- boot ---------- */

async function boot() {
  const user = await initAdminShell({ activeNav: 'scene-content' });
  if (!user) return;
  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  try {
    const data = await adminFetchJSON('/api/scene-content');
    scenes = data.scenes;
    if (!data.ready) {
      setStatus('Scene content storage is not set up yet. Run "npm run migrate" in the backend folder, then reload this page. You can look at the built-in text below, but saving is disabled until then.', 'error');
    }
    openScene(scenes[0].id);
    if (!data.ready) setStatus(statusEl.textContent, 'error');
  } catch (err) {
    editorEl.textContent = '';
    setStatus(err.message, 'error');
  }
}

boot();
