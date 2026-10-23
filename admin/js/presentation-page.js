/* ============================================================
   ADMIN/JS/PRESENTATION-PAGE.JS
   Phase 12 — Presentation Manager: list every scene from the
   existing GET /api/scenes, let the administrator drag to reorder,
   toggle enabled/disabled, and edit a duration override, then
   persist everything through the existing PUT /api/scenes/:id
   (one scene at a time — that endpoint has no bulk-update variant,
   and this phase deliberately does not add one; see the save flow
   below for how a single Save press is turned into the minimal set
   of per-scene PUT calls needed).

   All edits are staged in memory (`workingScenes`) against the
   last-loaded server state (`originalScenes`) and only sent on an
   explicit Save press — never on every drag/toggle/keystroke.
   ============================================================ */

import { initAdminShell, adminFetchJSON } from './admin-shell.js';
import { sceneLabel } from './scene-labels.js';

/** @type {Array<{id:string, enabled:boolean, sortOrder:number, durationOverrideMs:number|null}>} */
let originalScenes = [];
/** @type {Array<{id:string, enabled:boolean, sortOrder:number, durationOverrideMs:number|null}>} */
let workingScenes = [];
let draggingId = null;

/**
 * Phase 14 — these two scenes' duration is CALCULATED (the sum of their
 * eligible items' durations, set per item on the Updates / News pages),
 * so the page shows it read-only instead of offering an override.
 */
const CALCULATED_DURATION_SCENES = ['latest-updates', 'latest-news'];

/** @type {Record<string, {itemCount:number, totalDurationMs:number}>} from GET /api/scenes -> dynamicSections */
let dynamicSections = {};

/** 62000 -> "1 min 2 s"; 20000 -> "20 s" */
function formatTotal(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

/** Read-only duration cell for a calculated-duration scene. */
function buildCalculatedDuration(sceneId) {
  const wrap = document.createElement('div');
  wrap.className = 'scene-row__duration scene-row__duration--calculated';

  const caption = document.createElement('span');
  caption.textContent = 'Calculated duration';

  const value = document.createElement('p');
  value.className = 'scene-row__calculated-value';

  const hint = document.createElement('span');
  hint.className = 'scene-row__calculated-hint';

  const totals = dynamicSections[sceneId];
  if (totals && totals.itemCount > 0) {
    value.textContent = formatTotal(totals.totalDurationMs);
    hint.textContent = `${totals.itemCount} eligible ${totals.itemCount === 1 ? 'item' : 'items'} · sum of item durations`;
  } else {
    // No eligible items: show no duration at all (a stale or zero
    // number would mislead) — the presentation skips this section.
    value.textContent = 'Not shown';
    value.classList.add('scene-row__calculated-value--empty');
    hint.textContent = 'No eligible items today — skipped';
  }

  wrap.append(caption, value, hint);
  return wrap;
}

function cloneScenes(scenes) {
  return scenes.map((scene) => ({ ...scene }));
}

/** @returns {boolean} true if workingScenes differs from originalScenes in order, enabled, or duration */
function hasUnsavedChanges() {
  if (workingScenes.length !== originalScenes.length) return true;
  return workingScenes.some((scene, index) => {
    const original = originalScenes[index];
    return (
      !original ||
      original.id !== scene.id ||
      original.enabled !== scene.enabled ||
      original.durationOverrideMs !== scene.durationOverrideMs
    );
  });
}

function setSaveState() {
  const dirty = hasUnsavedChanges();
  document.getElementById('save-order-button').disabled = !dirty;
  document.getElementById('discard-changes-button').disabled = !dirty;
  document.getElementById('unsaved-indicator').hidden = !dirty;
}

function setStatus(message, variant) {
  const statusEl = document.getElementById('presentation-status');
  if (!message) {
    statusEl.hidden = true;
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = variant
    ? `presentation-status presentation-status--${variant}`
    : 'presentation-status';
}

function renderSceneList() {
  const list = document.getElementById('scene-list');
  list.innerHTML = '';

  workingScenes.forEach((scene, index) => {
    const row = document.createElement('li');
    row.className = 'scene-row';
    row.draggable = true;
    row.dataset.id = scene.id;

    const handle = document.createElement('span');
    handle.className = 'scene-row__handle';
    handle.setAttribute('aria-hidden', 'true');
    handle.textContent = '⋮⋮';

    const order = document.createElement('span');
    order.className = 'scene-row__order';
    order.textContent = String(index + 1);

    const info = document.createElement('div');
    info.className = 'scene-row__info';

    const name = document.createElement('p');
    name.className = 'scene-row__name';
    name.textContent = sceneLabel(scene.id);

    const idLabel = document.createElement('p');
    idLabel.className = 'scene-row__id';
    idLabel.textContent = scene.id;

    info.append(name, idLabel);

    const durationLabel = document.createElement('label');
    durationLabel.className = 'scene-row__duration';

    const durationCaption = document.createElement('span');
    durationCaption.textContent = 'Duration override (ms)';

    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = '1';
    durationInput.step = '100';
    durationInput.placeholder = 'Default';
    durationInput.value = scene.durationOverrideMs ?? '';
    durationInput.addEventListener('input', (event) => {
      const raw = event.target.value.trim();
      if (raw === '') {
        scene.durationOverrideMs = null;
      } else {
        const parsed = Math.round(Number(raw));
        scene.durationOverrideMs = Number.isFinite(parsed) && parsed > 0 ? parsed : scene.durationOverrideMs;
      }
      setSaveState();
    });

    durationLabel.append(durationCaption, durationInput);
    const durationCell = CALCULATED_DURATION_SCENES.includes(scene.id)
      ? buildCalculatedDuration(scene.id)
      : durationLabel;

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'scene-row__toggle';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = scene.enabled;

    const toggleTrack = document.createElement('span');
    toggleTrack.className = 'scene-row__toggle-track';
    toggleTrack.setAttribute('aria-hidden', 'true');

    const statusText = document.createElement('span');
    statusText.className = 'scene-row__status';
    statusText.textContent = scene.enabled ? 'Active' : 'Inactive';

    toggleInput.addEventListener('change', (event) => {
      scene.enabled = event.target.checked;
      statusText.textContent = scene.enabled ? 'Active' : 'Inactive';
      setSaveState();
    });

    toggleLabel.append(toggleInput, toggleTrack, statusText);

    // ---- Drag-and-drop reordering (native HTML5 DnD, no library) ----
    row.addEventListener('dragstart', () => {
      draggingId = scene.id;
      row.classList.add('scene-row--dragging');
    });
    row.addEventListener('dragend', () => {
      draggingId = null;
      row.classList.remove('scene-row--dragging');
    });
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      row.classList.add('scene-row--drop-target');
    });
    row.addEventListener('dragleave', () => {
      row.classList.remove('scene-row--drop-target');
    });
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      row.classList.remove('scene-row--drop-target');
      if (!draggingId || draggingId === scene.id) return;

      const fromIndex = workingScenes.findIndex((s) => s.id === draggingId);
      const toIndex = workingScenes.findIndex((s) => s.id === scene.id);
      if (fromIndex === -1 || toIndex === -1) return;

      const [moved] = workingScenes.splice(fromIndex, 1);
      workingScenes.splice(toIndex, 0, moved);

      renderSceneList();
      setSaveState();
    });

    row.append(handle, order, info, durationCell, toggleLabel);
    list.appendChild(row);
  });

  setSaveState();
}

async function loadScenes() {
  setStatus('Loading scenes…');
  try {
    const data = await adminFetchJSON('/api/scenes');
    dynamicSections = data.dynamicSections ?? {};
    const sorted = [...data.scenes].sort((a, b) => a.sortOrder - b.sortOrder);
    originalScenes = cloneScenes(sorted);
    workingScenes = cloneScenes(sorted);
    renderSceneList();
    setStatus(null);
  } catch (err) {
    setStatus(`Could not load scenes: ${err.message}`, 'error');
  }
}

async function saveChanges() {
  const saveButton = document.getElementById('save-order-button');
  saveButton.disabled = true;
  setStatus('Saving…');

  // Build the minimal set of PUT requests: one per scene whose
  // enabled state, duration override, or resulting position
  // (sortOrder = its new index) actually changed since the last
  // load. Existing API only supports updating one scene at a time
  // (PUT /api/scenes/:id) — a bulk-reorder endpoint was considered
  // but isn't needed: at most 12 scenes exist, so a short sequence
  // of per-row calls is simple, safe, and easy to reason about on
  // partial failure.
  const changedUpdates = [];
  workingScenes.forEach((scene, index) => {
    const original = originalScenes.find((s) => s.id === scene.id);
    const newSortOrder = index;
    const changed =
      !original ||
      original.enabled !== scene.enabled ||
      original.durationOverrideMs !== scene.durationOverrideMs ||
      original.sortOrder !== newSortOrder;

    if (changed) {
      changedUpdates.push({
        id: scene.id,
        body: {
          enabled: scene.enabled,
          sortOrder: newSortOrder,
          durationOverrideMs: CALCULATED_DURATION_SCENES.includes(scene.id) ? null : scene.durationOverrideMs,
        },
      });
    }
  });

  if (changedUpdates.length === 0) {
    setStatus(null);
    saveButton.disabled = true;
    return;
  }

  try {
    // Sequential, not Promise.all: keeps failure handling simple and
    // avoids any chance of interleaved writes landing in an order-
    // dependent inconsistent state.
    for (const update of changedUpdates) {
      // eslint-disable-next-line no-await-in-loop
      await adminFetchJSON(`/api/scenes/${update.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update.body),
      });
    }

    setStatus('Saved.', 'success');

    // Reload from the server to verify the persisted order/state,
    // per the "reload and verify" requirement — this also re-syncs
    // originalScenes so the Save/Discard buttons disable correctly.
    await loadScenes();
  } catch (err) {
    // Do NOT reload on failure — that would discard the
    // administrator's in-progress arrangement. Leave workingScenes
    // exactly as it was so they can fix the issue and retry Save.
    setStatus(`Save failed: ${err.message}. Your arrangement has not been lost — fix the issue and try Save again.`, 'error');
    saveButton.disabled = false;
  }
}

function discardChanges() {
  workingScenes = cloneScenes(originalScenes);
  renderSceneList();
  setStatus(null);
}

async function init() {
  const user = await initAdminShell({ activeNav: 'presentation' });
  if (!user) return;

  document.getElementById('save-order-button').addEventListener('click', saveChanges);
  document.getElementById('discard-changes-button').addEventListener('click', discardChanges);
  document.getElementById('preview-button').addEventListener('click', () => {
    // Opens the actual, unmodified presentation — no second
    // renderer, no SceneEngine duplication. It reflects whatever
    // configuration is currently SAVED (not any unsaved staged
    // edits in this tab), the same as the live display would.
    window.open('/', '_blank', 'noopener');
  });

  await loadScenes();
}

init();
