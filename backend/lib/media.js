/**
 * Phase 15 — media (image / video) for News and Updates.
 *
 * Design (no third-party upload library; nothing new to `npm install`):
 *
 *   - The browser sends the file as the RAW REQUEST BODY of
 *       PUT /api/news/:id/media      PUT /api/updates/:id/media
 *     (not multipart). The body is streamed to a temp file with a hard
 *     byte cap, so a large upload never sits in memory.
 *   - The file's REAL type is decided from its leading bytes
 *     (magic numbers). The browser-supplied Content-Type and file
 *     name are never trusted and never used for the stored name.
 *   - Allowlist only: JPEG, PNG, WebP, GIF, MP4, WebM. Anything else
 *     (SVG, HTML, executables, scripts, Matroska, HEIC, ...) is
 *     rejected, whatever it is called.
 *   - Stored name is generated:  <owner>/<kind>-<recordId>-<32 hex>.<ext>
 *     Only that relative path is persisted (column `image`).
 *   - Every path that is ever read from the database and deleted is
 *     first checked against that exact pattern and resolved inside
 *     the uploads root, so a stray/forged value can never delete an
 *     arbitrary file.
 *   - Order of operations on upload: temp file -> verify -> rename to
 *     final name -> database update -> delete the OLD file. Any
 *     failure removes the new file, so a failed save leaves nothing
 *     behind. Stale temp files from a crash are purged at start-up.
 *
 * Keep the limits/allowlist in step with admin/js/media-field.js.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
const TMP_DIR = path.join(UPLOADS_ROOT, '.tmp');

const OWNERS = ['news', 'updates', 'scenes'];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_ANY_BYTES = Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES);

const FITS = ['cover', 'contain'];
const LAYOUTS = ['split', 'full'];

/** Stored relative paths must match this exactly (see isSafeMediaPath). */
const SAFE_PATH_RE = /^(news|updates|scenes)\/(image|video)-\d+-[a-f0-9]{32}\.(jpg|png|webp|gif|mp4|webm)$/;

class MediaError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function ensureUploadDirs() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  OWNERS.forEach((owner) => fs.mkdirSync(path.join(UPLOADS_ROOT, owner), { recursive: true }));
}

/** Removes temp files left behind by an interrupted upload (older than 1 hour). */
function purgeStaleTempFiles() {
  try {
    const cutoff = Date.now() - 60 * 60 * 1000;
    fs.readdirSync(TMP_DIR).forEach((name) => {
      const file = path.join(TMP_DIR, name);
      try {
        const stat = fs.lstatSync(file);
        if (stat.isFile() && stat.mtimeMs < cutoff) fs.unlinkSync(file);
      } catch (err) {
        console.error('[media] could not purge temp file', name, err.message);
      }
    });
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[media] temp purge failed:', err.message);
  }
}

/** @param {unknown} rel @returns {boolean} */
function isSafeMediaPath(rel) {
  return typeof rel === 'string' && SAFE_PATH_RE.test(rel);
}

/**
 * Absolute path for a stored relative path, or null if it is not a
 * generated media path or would resolve outside the uploads root.
 * @param {unknown} rel
 * @returns {string|null}
 */
function resolveMediaPath(rel) {
  if (!isSafeMediaPath(rel)) return null;
  const abs = path.resolve(UPLOADS_ROOT, rel);
  if (!abs.startsWith(UPLOADS_ROOT + path.sep)) return null;
  return abs;
}

/**
 * Deletes a stored media file. Silently ignores anything that is not
 * a generated media path (e.g. a legacy value) and a file that is
 * already gone. Never throws.
 * @param {unknown} rel
 * @returns {boolean} whether a file was removed
 */
function deleteMediaFile(rel) {
  const abs = resolveMediaPath(rel);
  if (!abs) return false;
  try {
    const stat = fs.lstatSync(abs);
    if (!stat.isFile()) return false; // never follow symlinks / remove directories
    fs.unlinkSync(abs);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[media] could not delete', rel, err.message);
    return false;
  }
}

/**
 * Identifies an allowed file type from its first bytes.
 * @param {Buffer} head at least the first 64 bytes of the file
 * @returns {{kind: 'image'|'video', ext: string, mime: string}|null}
 */
function sniffMedia(head) {
  if (!head || head.length < 12) return null;

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { kind: 'image', ext: 'jpg', mime: 'image/jpeg' };
  }
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: 'image', ext: 'png', mime: 'image/png' };
  }
  const ascii = (start, end) => head.toString('latin1', start, end);
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') {
    return { kind: 'image', ext: 'gif', mime: 'image/gif' };
  }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return { kind: 'image', ext: 'webp', mime: 'image/webp' };
  }
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    // ISO base media files that are images (HEIC/AVIF) or QuickTime are not allowed.
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1', 'avif', 'avis', 'qt  '].includes(brand)) return null;
    return { kind: 'video', ext: 'mp4', mime: 'video/mp4' };
  }
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    // EBML container: WebM declares DocType "webm" near the start; Matroska says "matroska".
    if (head.toString('latin1', 0, Math.min(head.length, 64)).includes('webm')) {
      return { kind: 'video', ext: 'webm', mime: 'video/webm' };
    }
  }
  return null;
}

/**
 * Streams the request body to a temp file, enforcing `maxBytes`.
 * Rejects (and deletes the temp file) on overflow, abort or I/O error.
 * @param {import('http').IncomingMessage} req
 * @param {number} maxBytes
 * @returns {Promise<{tmpPath: string, size: number}>}
 */
function receiveToTempFile(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      req.resume();
      reject(new MediaError(413, `File is too large (limit ${Math.round(maxBytes / 1048576)} MB).`));
      return;
    }

    const tmpPath = path.join(TMP_DIR, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.part`);
    const out = fs.createWriteStream(tmpPath, { flags: 'wx' });
    let size = 0;
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      req.unpipe(out);
      out.destroy();
      fs.unlink(tmpPath, () => {});
      reject(err);
    };

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.resume();
        fail(new MediaError(413, `File is too large (limit ${Math.round(maxBytes / 1048576)} MB).`));
      }
    });
    req.on('aborted', () => fail(new MediaError(400, 'Upload was interrupted.')));
    req.on('error', () => fail(new MediaError(400, 'Upload failed.')));
    out.on('error', (err) => fail(err));
    out.on('finish', () => {
      if (settled) return;
      settled = true;
      resolve({ tmpPath, size });
    });

    req.pipe(out);
  });
}

function readHead(file, length = 64) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(length);
    const read = fs.readSync(fd, buf, 0, length, 0);
    return buf.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Receives, verifies and stores an uploaded file for one record.
 * On success the file is at its final name; the CALLER must delete it
 * again (deleteMediaFile) if its own database update then fails.
 * @param {import('http').IncomingMessage} req
 * @param {'news'|'updates'|'scenes'} owner  (scenes: Phase 16, recordId = the slot's ordinal)
 * @param {number} recordId
 * @returns {Promise<{relPath: string, mediaType: 'image'|'video', mime: string, size: number}>}
 */
async function storeUpload(req, owner, recordId) {
  if (!OWNERS.includes(owner)) throw new Error(`Unknown media owner: ${owner}`);
  ensureUploadDirs();

  const { tmpPath, size } = await receiveToTempFile(req, MAX_ANY_BYTES);

  try {
    if (size === 0) throw new MediaError(400, 'The uploaded file is empty.');

    const detected = sniffMedia(readHead(tmpPath));
    if (!detected) {
      throw new MediaError(
        415,
        'Unsupported file. Allowed: JPEG, PNG, WebP, GIF images and MP4, WebM videos.'
      );
    }

    const cap = detected.kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (size > cap) {
      throw new MediaError(413, `${detected.kind === 'image' ? 'Image' : 'Video'} is too large (limit ${Math.round(cap / 1048576)} MB).`);
    }

    const relPath = `${owner}/${detected.kind}-${recordId}-${crypto.randomBytes(16).toString('hex')}.${detected.ext}`;
    const finalPath = resolveMediaPath(relPath);
    if (!finalPath) throw new Error('Generated media path failed validation.');

    fs.renameSync(tmpPath, finalPath);
    return { relPath, mediaType: detected.kind, mime: detected.mime, size };
  } catch (err) {
    fs.unlink(tmpPath, () => {});
    throw err;
  }
}

/**
 * Adds PUT/DELETE /:id/media to a News/Updates router (which must
 * already have requireAuth applied via router.use, as both do).
 *
 * @param {import('express').Router} router
 * @param {Object} cfg
 * @param {'news'|'updates'} cfg.owner
 * @param {(id:number) => ({image: string|null}|undefined)} cfg.getById
 * @param {(id:number, fields:object) => boolean} cfg.update
 * @param {(id:number) => object} cfg.respond builds the JSON body for a success response
 * @param {(raw:string) => number|null} cfg.parseId
 */
function attachMediaRoutes(router, { owner, getById, update, respond, parseId }) {
  router.put('/:id/media', async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      req.resume();
      return res.status(400).json({ error: `Invalid ${owner} id.` });
    }
    const row = getById(id);
    if (!row) {
      req.resume();
      return res.status(404).json({ error: `Item ${id} not found.` });
    }

    let stored;
    try {
      stored = await storeUpload(req, owner, id);
    } catch (err) {
      if (err instanceof MediaError) return res.status(err.status).json({ error: err.message });
      console.error(`[PUT /api/${owner}/:id/media] failed:`, err);
      return res.status(500).json({ error: 'Failed to store the uploaded file.' });
    }

    try {
      const ok = update(id, { image: stored.relPath, mediaType: stored.mediaType });
      if (!ok) throw new Error('row vanished during upload');
    } catch (err) {
      deleteMediaFile(stored.relPath); // never leave a file the database does not know about
      console.error(`[PUT /api/${owner}/:id/media] database update failed:`, err);
      return res.status(500).json({ error: 'Failed to save the media. The upload was discarded.' });
    }

    if (row.image && row.image !== stored.relPath) deleteMediaFile(row.image);
    res.json(respond(id));
  });

  router.delete('/:id/media', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: `Invalid ${owner} id.` });
    const row = getById(id);
    if (!row) return res.status(404).json({ error: `Item ${id} not found.` });

    try {
      update(id, { image: null, mediaType: null });
    } catch (err) {
      console.error(`[DELETE /api/${owner}/:id/media] failed:`, err);
      return res.status(500).json({ error: 'Failed to remove the media.' });
    }
    if (row.image) deleteMediaFile(row.image);
    res.json(respond(id));
  });
}

module.exports = {
  UPLOADS_ROOT,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  FITS,
  LAYOUTS,
  MediaError,
  ensureUploadDirs,
  purgeStaleTempFiles,
  isSafeMediaPath,
  resolveMediaPath,
  deleteMediaFile,
  sniffMedia,
  storeUpload,
  attachMediaRoutes,
};
