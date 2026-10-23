/* ============================================================
   ASSET-MANAGER.JS
   Loads images and videos referenced by scenes, and quietly
   substitutes a placeholder when an asset is missing rather
   than breaking the display mid-loop.
   ============================================================ */

const PLACEHOLDER_IMAGE = './assets/images/placeholder.jpg';
const PLACEHOLDER_VIDEO = './assets/videos/placeholder.mp4';

export class AssetManager {
  /**
   * @param {Object} settings - global app settings
   */
  constructor(settings = {}) {
    this.settings = settings;

    /** @type {Map<string, HTMLImageElement>} */
    this._imageCache = new Map();
  }

  /**
   * Loads an image, resolving with the loaded <img> element.
   * Falls back to a placeholder image if the source fails to load.
   * @param {string} src
   * @returns {Promise<HTMLImageElement>}
   */
  loadImage(src) {
    if (this._imageCache.has(src)) {
      return Promise.resolve(this._imageCache.get(src));
    }

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        this._imageCache.set(src, img);
        resolve(img);
      };

      img.onerror = () => {
        console.warn(`[AssetManager] Missing image, using placeholder: ${src}`);
        if (src !== PLACEHOLDER_IMAGE) {
          resolve(this.loadImage(PLACEHOLDER_IMAGE));
        } else {
          // Even the placeholder failed — resolve with a bare element
          // rather than rejecting, so playback never halts.
          resolve(img);
        }
      };

      img.src = src;
    });
  }

  /**
   * Prepares a <video> element pointed at src, falling back to a
   * placeholder clip if the source is unavailable. Resolves once
   * the video has enough data to begin playback.
   * @param {string} src
   * @param {Object} [options]
   * @param {boolean} [options.muted=true]
   * @param {boolean} [options.loop=true]
   * @returns {Promise<HTMLVideoElement>}
   */
  loadVideo(src, { muted = true, loop = true } = {}) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = muted;
      video.loop = loop;
      video.playsInline = true;
      video.preload = 'auto';

      const onReady = () => {
        video.removeEventListener('loadeddata', onReady);
        resolve(video);
      };

      const onError = () => {
        console.warn(`[AssetManager] Missing video, using placeholder: ${src}`);
        video.removeEventListener('error', onError);
        if (src !== PLACEHOLDER_VIDEO) {
          video.src = PLACEHOLDER_VIDEO;
        } else {
          resolve(video);
        }
      };

      video.addEventListener('loadeddata', onReady, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.src = src;
    });
  }

  /**
   * Preloads a batch of image sources ahead of a scene appearing,
   * so entrance animations never stall on a network fetch.
   * @param {string[]} sources
   * @returns {Promise<HTMLImageElement[]>}
   */
  preloadImages(sources = []) {
    return Promise.all(sources.map((src) => this.loadImage(src)));
  }
}
