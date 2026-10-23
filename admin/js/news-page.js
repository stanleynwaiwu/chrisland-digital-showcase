/* ============================================================
   ADMIN/JS/NEWS-PAGE.JS
   Phase 13 — News admin: list, create, edit, publish/unpublish, and
   delete records in the existing `news` table, through the
   existing, already-tested backend API (GET/POST /api/news,
   PUT/DELETE /api/news/:id — see backend/routes/news.js). No new
   backend endpoint, no schema change. Phase 15 adds the optional image/video
   control (js/media-field.js).

   Mirrors admin/js/updates-page.js's structure exactly, adapted to
   the news schema's extra fields (content, category, publishedAt).
   ============================================================ */

import { initAdminShell, adminFetchJSON } from './admin-shell.js';
import { createMediaField, buildMediaThumb } from './media-field.js';

/** @type {Array<object>} last-loaded records from the server */
let records = [];

/** @type {number|null} id currently open in the edit form, or null when creating */
let editingId = null;

/** startDate stored on the record being edited — an unchanged past start date is a legitimate edit. */
let editingStartDate = null;

/** @type {Set<number>} ids with an in-flight publish-toggle/delete request */
const busyIds = new Set();

/** True while the create/edit form itself is submitting. */
let formBusy = false;

const form = document.getElementById('record-form');
const formPanel = document.getElementById('record-form-panel');
const formHeading = document.getElementById('record-form-heading');
const saveButton = document.getElementById('save-record-button');
const listEl = document.getElementById('record-list');
const emptyEl = document.getElementById('record-empty');

/** Phase 15: the optional image/video control inside the form. */
const mediaField = createMediaField({ root: document.getElementById('media-field'), kind: 'news' });

function setStatus(message, variant) {
  const statusEl = document.getElementById('record-status');
  if (!message) {
    statusEl.hidden = true;
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = variant ? `presentation-status presentation-status--${variant}` : 'presentation-status';
}

/** Converts a trimmed-empty string to null (how optional fields are cleared via the API). */
function emptyToNull(value) {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

/** Today's calendar date in the university time zone (Africa/Lagos), 'YYYY-MM-DD' — mirrors the server's lib/eligibility.js. */
function lagosToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Admin-facing duration label, e.g. 10000 -> "10 s" (API stores milliseconds). */
function formatDuration(durationMs) {
  return Number.isFinite(durationMs) ? `${durationMs / 1000} s` : '10 s';
}

function formatDateRange(startDate, endDate) {
  return `${startDate} → ${endDate}`;
}

/* ----------------------------------------------------------
   Rendering
   ---------------------------------------------------------- */

function renderList() {
  listEl.innerHTML = '';

  if (records.length === 0) {
    emptyEl.hidden = false;
    listEl.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  listEl.hidden = false;

  records.forEach((record) => {
    const isBusy = busyIds.has(record.id);

    const card = document.createElement('li');
    card.className = `record-card${isBusy ? ' record-card--busy' : ''}`;
    card.dataset.id = String(record.id);

    const header = document.createElement('div');
    header.className = 'record-card__header';

    const titleBlock = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'record-card__title';
    title.textContent = record.title;

    const metaParts = [formatDateRange(record.startDate, record.endDate)];
    metaParts.push(formatDuration(record.durationMs));
    if (record.mediaType) metaParts.push(record.mediaType === 'video' ? 'Video' : 'Image');
    if (record.category) metaParts.push(record.category);
    if (record.publishedAt) metaParts.push(`Published ${record.publishedAt}`);

    const meta = document.createElement('p');
    meta.className = 'record-card__meta';
    meta.textContent = metaParts.join(' · ');

    titleBlock.append(title, meta);

    const badge = document.createElement('span');
    badge.className = `admin-badge ${record.status === 'published' ? 'admin-badge--success' : 'admin-badge--warning'}`;
    badge.textContent = record.status === 'published' ? 'Published' : 'Draft';

    const lead = document.createElement('div');
    lead.className = 'record-card__lead';
    const thumb = buildMediaThumb(record);
    if (thumb) lead.append(thumb);
    lead.append(titleBlock);

    header.append(lead, badge);

    const summary = document.createElement('p');
    summary.className = 'record-card__summary';
    summary.textContent = record.summary;

    const actions = document.createElement('div');
    actions.className = 'record-card__actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'admin-button admin-button--ghost';
    editButton.textContent = 'Edit';
    editButton.disabled = isBusy;
    editButton.addEventListener('click', () => openEditForm(record));

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'admin-button admin-button--ghost';
    toggleButton.textContent = record.status === 'published' ? 'Unpublish' : 'Publish';
    toggleButton.disabled = isBusy;
    toggleButton.addEventListener('click', () => toggleStatus(record));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'admin-button admin-button--danger';
    deleteButton.textContent = 'Delete';
    deleteButton.disabled = isBusy;
    deleteButton.addEventListener('click', () => deleteRecord(record));

    actions.append(editButton, toggleButton, deleteButton);

    card.append(header, summary, actions);
    listEl.appendChild(card);
  });
}

/* ----------------------------------------------------------
   Data loading
   ---------------------------------------------------------- */

async function loadRecords({ quiet } = {}) {
  if (!quiet) setStatus('Loading news…');
  try {
    const data = await adminFetchJSON('/api/news');
    records = data.news ?? [];
    renderList();
    if (!quiet) setStatus(null);
  } catch (err) {
    setStatus(`Could not load news: ${err.message}`, 'error');
  }
}

/* ----------------------------------------------------------
   Create / edit form
   ---------------------------------------------------------- */

function resetFormFields() {
  form.reset();
  document.getElementById('field-status').value = 'draft';
  document.getElementById('field-duration').value = '10';
  mediaField.reset();
}

function fillFormFields(record) {
  document.getElementById('field-title').value = record.title;
  document.getElementById('field-category').value = record.category ?? '';
  document.getElementById('field-status').value = record.status;
  document.getElementById('field-start-date').value = record.startDate;
  document.getElementById('field-end-date').value = record.endDate;
  document.getElementById('field-published-at').value = record.publishedAt ?? '';
  document.getElementById('field-duration').value = String((record.durationMs ?? 10000) / 1000);
  document.getElementById('field-summary').value = record.summary;
  document.getElementById('field-content').value = record.content ?? '';
  mediaField.load(record);
}

function openCreateForm() {
  editingId = null;
  formHeading.textContent = 'New News Item';
  saveButton.textContent = 'Save';
  editingStartDate = null;
  document.getElementById('field-start-date').min = lagosToday();
  resetFormFields();
  formPanel.hidden = false;
  document.getElementById('field-title').focus();
}

function openEditForm(record) {
  editingId = record.id;
  editingStartDate = record.startDate;
  document.getElementById('field-start-date').removeAttribute('min');
  formHeading.textContent = 'Edit News Item';
  saveButton.textContent = 'Save Changes';
  fillFormFields(record);
  formPanel.hidden = false;
  document.getElementById('field-title').focus();
}

function closeForm() {
  formPanel.hidden = true;
  editingId = null;
  editingStartDate = null;
  form.reset();
  mediaField.reset();
}

function setFormBusy(busy) {
  formBusy = busy;
  saveButton.disabled = busy;
  document.getElementById('cancel-form-button').disabled = busy;
}

async function handleSubmit(event) {
  event.preventDefault();
  if (formBusy) return;

  const startInput = document.getElementById('field-start-date');
  const endInput = document.getElementById('field-end-date');
  endInput.setCustomValidity('');
  startInput.setCustomValidity('');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // New schedules (or an edit that MOVES the start date) may not start in
  // the past; re-saving an unchanged, already-started record is fine.
  if ((editingStartDate === null || startInput.value !== editingStartDate) && startInput.value < lagosToday()) {
    startInput.setCustomValidity(`Start date cannot be in the past (today is ${lagosToday()}, Lagos time).`);
    startInput.reportValidity();
    return;
  }

  if (startInput.value > endInput.value) {
    endInput.setCustomValidity('End date must be the same as or after the start date.');
    endInput.reportValidity();
    return;
  }

  const body = {
    title: document.getElementById('field-title').value,
    summary: document.getElementById('field-summary').value,
    content: emptyToNull(document.getElementById('field-content').value),
    category: emptyToNull(document.getElementById('field-category').value),
    status: document.getElementById('field-status').value,
    startDate: startInput.value,
    endDate: endInput.value,
    durationMs: Math.round(Number(document.getElementById('field-duration').value) * 1000),
    mediaFit: mediaField.getFit(),
    mediaLayout: mediaField.getLayout(),
    publishedAt: emptyToNull(document.getElementById('field-published-at').value),
  };

  const mediaProblem = mediaField.validate();
  if (mediaProblem) {
    setStatus(mediaProblem, 'error');
    return;
  }

  setFormBusy(true);
  setStatus(editingId ? 'Saving changes…' : 'Creating news item…');

  // The record's text is saved FIRST; media (if any) is applied to the saved
  // record afterwards, so a failed record save never uploads a file.
  let savedId = editingId;
  let createdNow = false;

  try {
    if (editingId) {
      await adminFetchJSON(`/api/news/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      const created = await adminFetchJSON('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      savedId = created.news.id;
      createdNow = true;
    }
  } catch (err) {
    // Leave the form open with everything the admin typed intact —
    // only the status line reports the failure. Nothing was uploaded.
    setStatus(`Failed to save: ${err.message}`, 'error');
    setFormBusy(false);
    return;
  }

  if (mediaField.hasChange()) {
    setStatus(mediaField.describeChange());
    try {
      await mediaField.commit(savedId);
    } catch (err) {
      if (createdNow) {
        // A new item must not end up half-created: take it back so the admin
        // can fix the file and save again with the form still filled in.
        let rolledBack = true;
        try {
          await adminFetchJSON(`/api/news/${savedId}`, { method: 'DELETE' });
        } catch {
          rolledBack = false;
        }
        setStatus(
          rolledBack
            ? `Not saved — the media upload failed: ${err.message}`
            : `The news item was saved but its media upload failed: ${err.message} Open it from the list to retry.`,
          'error'
        );
        if (!rolledBack) {
          closeForm();
          await loadRecords({ quiet: true });
        }
      } else {
        // Text changes are already saved; keep the form open so the file can be retried.
        setStatus(`Changes saved, but the media change failed: ${err.message}`, 'error');
        await loadRecords({ quiet: true });
      }
      setFormBusy(false);
      return;
    }
  }

  setStatus(editingId ? 'News item saved.' : 'News item created.', 'success');
  closeForm();
  await loadRecords({ quiet: true });
  setFormBusy(false);
}

/* ----------------------------------------------------------
   Row actions: publish/unpublish toggle, delete
   ---------------------------------------------------------- */

async function toggleStatus(record) {
  if (busyIds.has(record.id)) return;
  const nextStatus = record.status === 'published' ? 'draft' : 'published';

  busyIds.add(record.id);
  renderList();
  setStatus(nextStatus === 'published' ? 'Publishing…' : 'Unpublishing…');

  try {
    await adminFetchJSON(`/api/news/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    setStatus(nextStatus === 'published' ? 'News item published.' : 'News item moved to draft.', 'success');
    await loadRecords({ quiet: true });
  } catch (err) {
    setStatus(`Failed to update status: ${err.message}`, 'error');
  } finally {
    busyIds.delete(record.id);
    renderList();
  }
}

async function deleteRecord(record) {
  if (busyIds.has(record.id)) return;

  const confirmed = window.confirm(`Delete "${record.title}"? This cannot be undone.`);
  if (!confirmed) return;

  busyIds.add(record.id);
  renderList();
  setStatus('Deleting…');

  try {
    await adminFetchJSON(`/api/news/${record.id}`, { method: 'DELETE' });
    setStatus('News item deleted.', 'success');
    if (editingId === record.id) closeForm();
    await loadRecords({ quiet: true });
  } catch (err) {
    setStatus(`Failed to delete: ${err.message}`, 'error');
    busyIds.delete(record.id);
    renderList();
  }
}

/* ----------------------------------------------------------
   Init
   ---------------------------------------------------------- */

async function init() {
  const user = await initAdminShell({ activeNav: 'news' });
  if (!user) return;

  document.getElementById('new-record-button').addEventListener('click', openCreateForm);
  document.getElementById('cancel-form-button').addEventListener('click', closeForm);
  form.addEventListener('submit', handleSubmit);

  await loadRecords();
}

init();
