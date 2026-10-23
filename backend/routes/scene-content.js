/**
 * Phase 16 — admin API for the content of the ten original scenes.
 *
 *   GET    /api/scene-content                  all ten scenes: schema, built-in text, stored edits
 *   GET    /api/scene-content/:id              one scene
 *   PUT    /api/scene-content/:id              save text + lists   { text:{}, lists:{} }
 *   DELETE /api/scene-content/:id              revert the scene to its built-in content (also its media)
 *   PUT    /api/scene-content/:id/media/:slot  upload / replace media (raw body, same as News/Updates)
 *   POST   /api/scene-content/:id/media/:slot/hide   show the scene's no-media fallback for this slot
 *   DELETE /api/scene-content/:id/media/:slot  revert the slot to the original built-in media
 *
 * All behind requireAuth. Never touches scene_config (enabled / order /
 * duration), the News/Updates tables, or data/*.json. The scene id must be one
 * of the ten code-defined scenes; nothing here creates or deletes a scene.
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getSceneSchema } = require('../lib/scene-content-schema');
const content = require('../lib/scene-content');
const { MediaError, storeUpload, deleteMediaFile } = require('../lib/media');

const router = express.Router();
router.use(requireAuth);

const tableMissing = (res) =>
  res.status(503).json({ error: 'Scene content storage is not set up yet. Run "npm run migrate" in the backend folder, then try again.' });

function loadSchema(req, res) {
  const schema = getSceneSchema(req.params.id);
  if (!schema) {
    res.status(404).json({ error: 'Unknown scene.' });
    return null;
  }
  return schema;
}

router.get('/', (req, res) => {
  try {
    res.json({
      ready: content.tableExists(),
      scenes: content.SCENES.map((s) => content.describeScene(s.id)),
    });
  } catch (err) {
    console.error('[GET /api/scene-content] failed:', err);
    res.status(500).json({ error: 'Failed to load scene content.' });
  }
});

router.get('/:id', (req, res) => {
  if (!loadSchema(req, res)) return;
  try {
    res.json({ ready: content.tableExists(), scene: content.describeScene(req.params.id) });
  } catch (err) {
    console.error('[GET /api/scene-content/:id] failed:', err);
    res.status(500).json({ error: 'Failed to load scene content.' });
  }
});

router.put('/:id', (req, res) => {
  if (!loadSchema(req, res)) return;
  if (!content.tableExists()) return tableMissing(res);
  try {
    content.setTextAndLists(req.params.id, req.body);
    res.json({ scene: content.describeScene(req.params.id) });
  } catch (err) {
    if (err instanceof content.ContentError) return res.status(400).json({ error: err.message });
    console.error('[PUT /api/scene-content/:id] failed:', err);
    res.status(500).json({ error: 'Failed to save scene content.' });
  }
});

router.delete('/:id', (req, res) => {
  if (!loadSchema(req, res)) return;
  if (!content.tableExists()) return tableMissing(res);
  try {
    const refs = content.resetScene(req.params.id);
    refs.forEach((ref) => ref && ref.path && deleteMediaFile(ref.path));
    res.json({ scene: content.describeScene(req.params.id) });
  } catch (err) {
    console.error('[DELETE /api/scene-content/:id] failed:', err);
    res.status(500).json({ error: 'Failed to reset the scene.' });
  }
});

function loadSlot(req, res) {
  const schema = loadSchema(req, res);
  if (!schema) return null;
  const index = schema.media.findIndex((m) => m.slot === req.params.slot);
  if (index === -1) {
    res.status(404).json({ error: 'This scene has no such media slot.' });
    return null;
  }
  return { spec: schema.media[index], ordinal: index + 1 };
}

router.put('/:id/media/:slot', async (req, res) => {
  const slot = loadSlot(req, res);
  if (!slot) {
    req.resume();
    return;
  }
  if (!content.tableExists()) {
    req.resume();
    return tableMissing(res);
  }

  let stored;
  try {
    stored = await storeUpload(req, 'scenes', slot.ordinal);
  } catch (err) {
    if (err instanceof MediaError) return res.status(err.status).json({ error: err.message });
    console.error('[PUT /api/scene-content media] failed:', err);
    return res.status(500).json({ error: 'Failed to store the uploaded file.' });
  }

  if (!slot.spec.accepts.includes(stored.mediaType)) {
    deleteMediaFile(stored.relPath);
    return res.status(415).json({ error: `This slot accepts ${slot.spec.accepts.join(' or ')} only.` });
  }

  let previous;
  try {
    previous = content.setMediaRef(req.params.id, req.params.slot, { path: stored.relPath, type: stored.mediaType });
  } catch (err) {
    deleteMediaFile(stored.relPath);
    console.error('[PUT /api/scene-content media] database update failed:', err);
    return res.status(500).json({ error: 'Failed to save the media. The upload was discarded.' });
  }
  if (previous && previous.path && previous.path !== stored.relPath) deleteMediaFile(previous.path);
  res.json({ scene: content.describeScene(req.params.id) });
});

function clearSlot(req, res, ref) {
  const slot = loadSlot(req, res);
  if (!slot) return;
  if (!content.tableExists()) return tableMissing(res);
  try {
    const previous = content.setMediaRef(req.params.id, req.params.slot, ref);
    if (previous && previous.path) deleteMediaFile(previous.path);
    res.json({ scene: content.describeScene(req.params.id) });
  } catch (err) {
    console.error('[scene-content media] failed:', err);
    res.status(500).json({ error: 'Failed to update the media.' });
  }
}

router.post('/:id/media/:slot/hide', (req, res) => clearSlot(req, res, { removed: true }));
router.delete('/:id/media/:slot', (req, res) => clearSlot(req, res, null));

module.exports = router;
