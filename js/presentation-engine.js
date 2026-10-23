/* ============================================================
   PRESENTATION-ENGINE.JS
   Controls HOW scenes are displayed over time: autoplay,
   looping, duration, pause/resume, next/previous, restart,
   keyboard shortcuts, and progress tracking.

   This engine does not know how to render a scene — that is
   scene-engine.js's job. PresentationEngine only decides *when*
   scene-engine should transition, and exposes playback state.

   Events dispatched: presentation:start, presentation:end
   (scene:load / scene:enter / scene:display / scene:exit are
   dispatched by SceneEngine itself).
   ============================================================ */

const DEFAULT_CONFIG = {
  autoPlay: true,
  loop: true,
  defaultDurationMs: 12000,
  transitionDurationMs: 1000,
  keyboardShortcutsEnabled: true,
};

export class PresentationEngine extends EventTarget {
  /**
   * @param {Object} config
   * @param {import('./scene-engine.js').SceneEngine} config.sceneEngine
   * @param {HTMLElement} config.container - element used for the
   *   "no scenes registered" empty state
   * @param {Object} [config.settings] - full app settings.json contents
   * @param {EventTarget} [config.keyboardTarget] - defaults to window
   */
  constructor({ sceneEngine, container, settings = {}, keyboardTarget = window }) {
    super();
    this.sceneEngine = sceneEngine;
    this.container = container;
    this.keyboardTarget = keyboardTarget;

    this.config = { ...DEFAULT_CONFIG, ...(settings.presentation ?? {}) };

    this.isPlaying = false;
    this.isPaused = false;

    /** @type {number|null} setTimeout handle for the next auto-advance */
    this._advanceTimer = null;

    /** @type {number|null} setInterval handle for progress updates */
    this._progressTimer = null;

    /** @type {number} epoch ms when the current scene started being displayed */
    this._sceneStartedAt = 0;

    /** @type {number} ms already elapsed in the current scene, kept across pauses */
    this._elapsedMs = 0;

    /** @type {number} the full duration budgeted for the current scene */
    this._currentDurationMs = 0;

    this._boundKeydown = this._handleKeydown.bind(this);
  }

  /**
   * Wires up keyboard shortcuts and checks whether there are any
   * registered scenes to play. Does not start playback.
   * @returns {boolean} true if scenes are ready to present
   */
  init() {
    if (this.config.keyboardShortcutsEnabled) {
      this.keyboardTarget.addEventListener('keydown', this._boundKeydown);
    }

    if (this.sceneEngine.getSceneCount() === 0) {
      this._renderEmptyState();
      return false;
    }

    return true;
  }

  /**
   * Begins the presentation from the first scene (or resumes from
   * the current scene index if one is already active). No-ops with
   * an empty-state message if no scenes are registered.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.sceneEngine.getSceneCount() === 0) {
      this._renderEmptyState();
      return;
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;
    this._emit('presentation:start', {});

    const startIndex = this.sceneEngine.currentIndex >= 0 ? this.sceneEngine.currentIndex : 0;
    await this.sceneEngine.transitionToScene(startIndex);
    this._beginSceneTimer();
  }

  /**
   * Pauses autoplay without changing the currently displayed scene.
   * The remaining time on the current scene is preserved so
   * resume() continues rather than restarting the countdown.
   */
  pause() {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    this._elapsedMs += this._msSinceSceneStarted();
    this._clearTimers();
  }

  /**
   * Resumes autoplay from wherever pause() left off.
   */
  resume() {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this._beginSceneTimer(this._currentDurationMs - this._elapsedMs);
  }

  /** Toggles pause/resume — bound to the Space key. */
  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Advances to the next scene immediately and resets the timer.
   * Stops the presentation if looping is disabled and this was the
   * last scene.
   * @returns {Promise<void>}
   */
  async next() {
    if (this.sceneEngine.getSceneCount() === 0) return;

    const isLastScene = this.sceneEngine.currentIndex === this.sceneEngine.getSceneCount() - 1;
    if (isLastScene && !this.config.loop) {
      this.stop();
      return;
    }

    this._clearTimers();
    await this.sceneEngine.nextScene();
    if (this.isPlaying && !this.isPaused) {
      this._beginSceneTimer();
    }
  }

  /**
   * Returns to the previous scene immediately and resets the timer.
   * @returns {Promise<void>}
   */
  async previous() {
    if (this.sceneEngine.getSceneCount() === 0) return;
    this._clearTimers();
    await this.sceneEngine.previousScene();
    if (this.isPlaying && !this.isPaused) {
      this._beginSceneTimer();
    }
  }

  /**
   * Stops playback and restarts the presentation from the first scene.
   * @returns {Promise<void>}
   */
  async restart() {
    if (this.sceneEngine.getSceneCount() === 0) return;
    this._clearTimers();
    await this.sceneEngine.restart();
    this.isPlaying = true;
    this.isPaused = false;
    this._beginSceneTimer();
  }

  /**
   * Stops playback entirely (does not clear the displayed scene).
   */
  stop() {
    this._clearTimers();
    if (this.isPlaying) {
      this._emit('presentation:end', {});
    }
    this.isPlaying = false;
    this.isPaused = false;
  }

  /**
   * Removes keyboard listeners and stops playback. Call when the
   * presentation engine itself is being torn down.
   */
  destroy() {
    this.stop();
    this.keyboardTarget.removeEventListener('keydown', this._boundKeydown);
  }

  /**
   * @returns {{currentIndex: number, totalScenes: number, elapsedMs: number, durationMs: number, percentage: number, isPlaying: boolean, isPaused: boolean}}
   */
  getProgress() {
    const totalScenes = this.sceneEngine.getSceneCount();
    const elapsedMs = this.isPaused
      ? this._elapsedMs
      : this._elapsedMs + this._msSinceSceneStarted();
    const durationMs = this._currentDurationMs;
    const percentage = durationMs > 0 ? Math.min(1, elapsedMs / durationMs) : 0;

    return {
      currentIndex: this.sceneEngine.currentIndex,
      totalScenes,
      elapsedMs,
      durationMs,
      percentage,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
    };
  }

  // ----------------------------------------------------------
  // Internal
  // ----------------------------------------------------------

  /**
   * Starts (or resumes) the countdown for the current scene, then
   * auto-advances to the next scene when it elapses.
   * @param {number} [overrideDurationMs] - used by resume() to play
   *   out only the remaining time rather than the full duration
   * @private
   */
  _beginSceneTimer(overrideDurationMs) {
    if (!this.config.autoPlay) return;

    const currentScene = this.sceneEngine.getSceneByIndex(this.sceneEngine.currentIndex);
    const fullDuration = currentScene?.duration ?? this.config.defaultDurationMs;

    if (overrideDurationMs === undefined) {
      this._elapsedMs = 0;
      this._currentDurationMs = fullDuration;
    }

    const remaining = overrideDurationMs ?? fullDuration;
    this._sceneStartedAt = performance.now();

    this._advanceTimer = setTimeout(async () => {
      const isLastScene = this.sceneEngine.currentIndex === this.sceneEngine.getSceneCount() - 1;
      if (isLastScene && !this.config.loop) {
        this.stop();
        return;
      }
      this._elapsedMs = 0;
      await this.sceneEngine.nextScene();
      if (this.isPlaying && !this.isPaused) {
        this._beginSceneTimer();
      }
    }, Math.max(0, remaining));

    this._progressTimer = setInterval(() => {
      this._emit('presentation:progress', this.getProgress());
    }, 250);
  }

  /** @private */
  _msSinceSceneStarted() {
    return this._sceneStartedAt ? performance.now() - this._sceneStartedAt : 0;
  }

  /** @private */
  _clearTimers() {
    if (this._advanceTimer) {
      clearTimeout(this._advanceTimer);
      this._advanceTimer = null;
    }
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
  }

  /**
   * @param {KeyboardEvent} event
   * @private
   */
  _handleKeydown(event) {
    switch (event.code) {
      case 'ArrowRight':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.previous();
        break;
      case 'Space':
        event.preventDefault();
        this.togglePause();
        break;
      case 'Home':
        event.preventDefault();
        this.restart();
        break;
      default:
        break;
    }
  }

  /**
   * Renders a centred, professional empty-state message when no
   * scenes have been registered. Reuses existing layout utilities
   * and design tokens rather than introducing new CSS.
   * @private
   */
  _renderEmptyState() {
    if (!this.container) return;

    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'full-screen center-layout';

    const message = document.createElement('p');
    message.textContent = 'No presentation scenes have been created yet.';
    message.style.fontFamily = 'var(--font-display)';
    message.style.fontSize = 'var(--text-md)';
    message.style.fontWeight = 'var(--weight-medium)';
    message.style.color = 'var(--color-text-muted)';
    message.style.letterSpacing = 'var(--tracking-tight)';
    message.style.maxWidth = '24ch';
    message.style.textAlign = 'center';

    wrapper.appendChild(message);
    this.container.appendChild(wrapper);
  }

  /**
   * @param {string} type
   * @param {Object} detail
   * @private
   */
  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
