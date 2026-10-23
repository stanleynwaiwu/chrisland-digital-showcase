/* ============================================================
   JS/DYNAMIC-MEDIA.JS
   Phase 15 — image / video on a News or Updates slide.

   A slide's media is OPTIONAL and PURELY DECORATIVE: the slide's
   text and its configured duration never depend on it. Any problem
   — no/invalid path, file deleted, backend offline, decode error,
   slow network, autoplay refused — drops that slide back to its
   text-only layout. Nothing here can delay or block the section's
   timeline (js/dynamic-sequence.js owns the clock).

   Layouts (data-layout on the slide):
     text   no media (or media failed)
     split  text on the left, media panel on the right
     full   media-focused: large media frame with the text over a scrim
   Fit (data-fit on the media frame): cover | contain — object-fit,
   so the picture is never stretched.

   Videos are muted, looped and inline; they are paused and released
   (disposeMedia) when their slide goes away so a retired slide never
   keeps decoding in the background. Load-timeout timers are tracked
   per slide and cancelled on disposal — nothing leaks across slides
   or refreshes.
   ============================================================ */

const SAFE_PATH_RE = /^(news|updates)\/(image|video)-\d+-[a-f0-9]{32}\.(jpg|png|webp|gif|mp4|webm)$/;

// Short on purpose: a slide's own duration may be as little as 3 s, and a
// media panel that has not appeared by then is better dropped than waited on.
const IMAGE_LOAD_TIMEOUT_MS = 4000;
const VIDEO_LOAD_TIMEOUT_MS = 6000;

/** element -> function that cancels its timers/listeners and releases the media */
const disposers = new WeakMap();

/**
 * @param {{image?: string|null, mediaType?: string|null, mediaFit?: string, mediaLayout?: string}} item
 * @param {string|null|undefined} backendOrigin e.g. 'http://localhost:4000'
 * @returns {{url: string, type: 'image'|'video', fit: 'cover'|'contain', layout: 'split'|'full'}|null}
 */
export function resolveMedia(item, backendOrigin) {
  if (!item || !backendOrigin) return null;
  const path = item.image;
  if (typeof path !== 'string' || !SAFE_PATH_RE.test(path)) return null;
  const type = item.mediaType;
  if (type !== 'image' && type !== 'video') return null;
  // The stored name encodes the kind; refuse a record whose metadata disagrees with it.
  if (!path.includes(`/${type}-`)) return null;
  return {
    url: `${String(backendOrigin).replace(/\/+$/, '')}/uploads/${path}`,
    type,
    fit: item.mediaFit === 'contain' ? 'contain' : 'cover',
    layout: item.mediaLayout === 'full' ? 'full' : 'split',
  };
}

/** Warms the browser cache for a run's images so they are ready when their slide appears. */
export function prefetchImages(items, backendOrigin) {
  (items ?? []).forEach((item) => {
    const media = resolveMedia(item, backendOrigin);
    if (media && media.type === 'image') {
      const img = new Image();
      img.decoding = 'async';
      img.src = media.url;
    }
  });
}

/**
 * Adds the item's media (if it has valid media) to a slide and sets the
 * slide's layout. Always leaves the slide in a valid state: with no
 * media, or if the media later fails, the slide is `data-layout="text"`.
 * @param {HTMLElement} slide
 * @param {object} item
 * @param {string|null|undefined} backendOrigin
 */
export function attachMedia(slide, item, backendOrigin) {
  const media = resolveMedia(item, backendOrigin);
  if (!media) {
    slide.dataset.layout = 'text';
    return;
  }

  slide.dataset.layout = media.layout;

  const frame = document.createElement('div');
  frame.className = 'dyn-slide__media';
  frame.dataset.fit = media.fit;
  frame.dataset.type = media.type;

  let timeoutId = null;
  let node = null;
  let done = false;
  let disposed = false;

  const cleanup = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (node && node.tagName === 'VIDEO') {
      try {
        node.pause();
        node.removeAttribute('src');
        node.load(); // releases the decoder and network connection
      } catch {
        /* nothing to release */
      }
    }
  };

  const fail = () => {
    if (done) return;
    done = true;
    cleanup();
    frame.remove();
    slide.dataset.layout = 'text';
  };

  const ready = () => {
    if (done) return;
    done = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    frame.classList.add('is-ready');
  };

  if (media.type === 'video') {
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.controls = false;
    video.disablePictureInPicture = true;
    video.preload = 'auto';
    node = video;

    video.addEventListener('loadeddata', () => {
      const attempt = video.play();
      if (attempt && typeof attempt.then === 'function') {
        attempt.then(ready, fail); // autoplay refused / decode failure -> text only
      } else {
        ready();
      }
    });
    // An error after the video was showing (decode failure, file vanished)
    // also drops the slide back to text.
    video.addEventListener('error', () => {
      if (disposed) return; // our own release (load() with no src) can raise one
      done = false;
      fail();
    });
    timeoutId = setTimeout(fail, VIDEO_LOAD_TIMEOUT_MS);
    video.src = media.url;
  } else {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    node = img;
    img.addEventListener('load', ready);
    img.addEventListener('error', fail);
    timeoutId = setTimeout(fail, IMAGE_LOAD_TIMEOUT_MS);
    img.src = media.url;
  }

  frame.append(node);
  slide.append(frame);
  disposers.set(frame, () => {
    disposed = true;
    done = true;
    cleanup();
  });
}

/**
 * Cancels timers and releases any video inside `root` (a slide or the
 * whole stage). Safe to call repeatedly and on elements with no media.
 * @param {ParentNode|null} root
 */
export function disposeMedia(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  root.querySelectorAll('.dyn-slide__media').forEach((frame) => {
    const dispose = disposers.get(frame);
    if (dispose) {
      dispose();
      disposers.delete(frame);
    }
  });
  if (root.classList && root.classList.contains('dyn-slide__media')) {
    const dispose = disposers.get(root);
    if (dispose) {
      dispose();
      disposers.delete(root);
    }
  }
}
