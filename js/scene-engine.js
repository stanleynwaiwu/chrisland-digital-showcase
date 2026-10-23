/* ============================================================
   SCENE-ENGINE.JS

   Owns the scene registry and the per-scene lifecycle:

     Initialize -> Load Assets -> Enter -> Display -> Exit -> Cleanup

   Playback control (autoplay, looping, pause/resume, keyboard,
   progress) does NOT live here — that is presentation-engine.js.

   This engine is also responsible for the cinematic page-to-page
   transition system.

   Transition philosophy:
   - Scenes may explicitly define a transition.
   - If a scene uses the old default "fade", the engine can assign
     a cinematic transition based on the presentation journey.
   - Transition direction can be controlled independently.
   - The actual scene content and its internal animations remain
     completely untouched.
   ============================================================ */


const VALID_TRANSITIONS = new Set([
  'fade',
  'slide',
  'zoom',
  'blur',
  'scale',
  'reveal',
  'wipe',
  'cinematic',
]);


/* ------------------------------------------------------------
   PRESENTATION TRANSITION MAP

   These are deliberately chosen rather than random.

   The presentation should feel like a journey:

   Opening
      ↓
   Welcome
      ↓
   Vision
      ↓
   Campus
      ↓
   Academics
      ↓
   Student Life
      ↓
   Research
      ↓
   Graduate Success
      ↓
   Admissions
      ↓
   Contact
      ↓
   Opening

   Each movement gets its own visual personality.
   ------------------------------------------------------------ */

const CINEMATIC_TRANSITIONS = {
  'opening-logo': {
    type: 'zoom',
    direction: 'center',
  },

  'welcome-scene': {
    type: 'slide',
    direction: 'left',
  },

  'vision-mission-values': {
    type: 'scale',
    direction: 'center',
  },

  'campus-experience': {
    type: 'slide',
    direction: 'right',
  },

  'academic-programmes': {
    type: 'blur',
    direction: 'center',
  },

  'student-life': {
    type: 'wipe',
    direction: 'left',
  },

  'research-innovation': {
    type: 'reveal',
    direction: 'up',
  },

  'graduate-success': {
    type: 'zoom',
    direction: 'center',
  },

  admissions: {
    type: 'slide',
    direction: 'up',
  },

  contact: {
    type: 'cinematic',
    direction: 'center',
  },
};


/* ------------------------------------------------------------
   FALLBACK JOURNEY

   If a future scene is added and isn't included in the map,
   the engine still gives it a varied transition rather than
   falling back to fade every time.
   ------------------------------------------------------------ */

const FALLBACK_TRANSITIONS = [
  { type: 'slide', direction: 'left' },
  { type: 'scale', direction: 'center' },
  { type: 'blur', direction: 'center' },
  { type: 'slide', direction: 'right' },
  { type: 'wipe', direction: 'up' },
  { type: 'reveal', direction: 'down' },
];


/* ------------------------------------------------------------
   DEFAULT TRANSITION TIMING

   These are intentionally slightly longer than the old simple
   fade so the movement feels cinematic rather than like a UI
   route change.
   ------------------------------------------------------------ */

const TRANSITION_DURATION = {
  fade: 900,
  slide: 1100,
  zoom: 1200,
  blur: 1000,
  scale: 1000,
  reveal: 1150,
  wipe: 1050,
  cinematic: 1400,
};


export class SceneEngine extends EventTarget {
  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {import('./asset-manager.js').AssetManager} config.assetManager
   * @param {import('./animation-engine.js').AnimationEngine} config.animationEngine
   * @param {Object} config.settings
   */
  constructor({
    container,
    assetManager,
    animationEngine,
    settings,
  }) {
    super();

    this.container = container;
    this.assetManager = assetManager;
    this.animationEngine = animationEngine;
    this.settings = settings;

    /** @type {Map<string, Object>} */
    this._registry = new Map();

    /** @type {string[]} */
    this._order = [];

    /** @type {number} */
    this.currentIndex = -1;

    /** @type {Object|null} */
    this.currentScene = null;

    /** @type {HTMLElement|null} */
    this._currentElement = null;
  }


  /**
   * @returns {Promise<void>}
   */
  async init() {
    this._registry.clear();
    this._order = [];
    this.currentIndex = -1;
    this.currentScene = null;
    this._currentElement = null;
  }


  /**
   * Registers a scene.
   *
   * @param {Object} sceneDefinition
   * @returns {Object}
   */
  register(sceneDefinition) {
    if (!sceneDefinition || typeof sceneDefinition !== 'object') {
      throw new TypeError(
        '[SceneEngine] register() requires a scene definition object.'
      );
    }

    if (!sceneDefinition.id) {
      throw new TypeError(
        '[SceneEngine] register() requires an "id".'
      );
    }

    if (typeof sceneDefinition.render !== 'function') {
      throw new TypeError(
        `[SceneEngine] register("${sceneDefinition.id}") requires a render() function.`
      );
    }

    if (
      sceneDefinition.transition &&
      typeof sceneDefinition.transition === 'string' &&
      !VALID_TRANSITIONS.has(sceneDefinition.transition)
    ) {
      console.warn(
        `[SceneEngine] register("${sceneDefinition.id}"): unknown transition "${sceneDefinition.transition}", defaulting to cinematic mapping.`
      );
    }


    const isNew = !this._registry.has(sceneDefinition.id);

    this._registry.set(
      sceneDefinition.id,
      sceneDefinition
    );

    if (isNew) {
      this._order.push(sceneDefinition.id);
    }

    return sceneDefinition;
  }


  /** @param {string} id */
  unregister(id) {
    this._registry.delete(id);
    this._order = this._order.filter(
      (sceneId) => sceneId !== id
    );
  }


  /** @returns {Object[]} */
  getScenes() {
    return this._order.map(
      (id) => this._registry.get(id)
    );
  }


  /** @returns {number} */
  getSceneCount() {
    return this._order.length;
  }


  /** @param {number} index */
  getSceneByIndex(index) {
    const id = this._order[index];
    return id
      ? this._registry.get(id)
      : null;
  }


  /** @param {string} id */
  getSceneById(id) {
    return this._registry.get(id) ?? null;
  }


  /* ----------------------------------------------------------
     TRANSITION RESOLUTION
     ---------------------------------------------------------- */

  /**
   * Determines the cinematic transition for a scene.

   * Existing scenes can still explicitly provide:
   *
   *   transition: 'slide'
   *
   * or:
   *
   *   transition: {
   *     type: 'slide',
   *     direction: 'left'
   *   }
   *
   * However, old scenes using:
   *
   *   transition: 'fade'
   *
   * are treated as legacy/default configuration and receive the
   * presentation's cinematic transition map instead.
   *
   * @param {Object} scene
   * @param {number} index
   * @returns {{type:string,direction:string}}
   * @private
   */
  _resolveTransition(scene, index) {
    if (!scene) {
      return {
        type: 'fade',
        direction: 'center',
      };
    }


    /*
     * Explicit object configuration always wins.
     */
    if (
      scene.transition &&
      typeof scene.transition === 'object'
    ) {
      const type = VALID_TRANSITIONS.has(scene.transition.type)
        ? scene.transition.type
        : 'fade';

      return {
        type,
        direction: scene.transition.direction ?? 'center',
      };
    }


    /*
     * Explicit non-fade transition always wins.
     *
     * Example:
     * transition: 'blur'
     */
    if (
      typeof scene.transition === 'string' &&
      scene.transition !== 'fade' &&
      VALID_TRANSITIONS.has(scene.transition)
    ) {
      return {
        type: scene.transition,
        direction: 'center',
      };
    }


    /*
     * Legacy "fade" configuration is replaced with the cinematic
     * transition assigned to this scene.
     */
    const mapped =
      CINEMATIC_TRANSITIONS[scene.id];

    if (mapped) {
      return mapped;
    }


    /*
     * Future scenes receive a varied fallback transition.
     */
    return FALLBACK_TRANSITIONS[
      index % FALLBACK_TRANSITIONS.length
    ];
  }


  /**
   * Runs the full lifecycle to transition from the currently
   * displayed scene to another scene.
   *
   * @param {number} index
   * @returns {Promise<Object|null>}
   */
  async transitionToScene(index) {
    const nextScene = this.getSceneByIndex(index);

    if (!nextScene) {
      console.warn(
        `[SceneEngine] transitionToScene: index ${index} out of range`
      );

      return null;
    }


    const context = {
      assetManager: this.assetManager,
      animationEngine: this.animationEngine,
      settings: this.settings,
    };


    const nextTransition =
      this._resolveTransition(
        nextScene,
        index
      );


    /* --------------------------------------------------------
       EXIT CURRENT SCENE
       -------------------------------------------------------- */

    if (
      this.currentScene &&
      this._currentElement
    ) {
      this._emit(
        'scene:exit',
        {
          scene: this.currentScene,
        }
      );


      await this._runTransition(
        this._currentElement,
        this._resolveTransition(
          this.currentScene,
          this.currentIndex
        ),
        'out'
      );


      this.currentScene.cleanup?.(
        context
      );
    }


    this.container.innerHTML = '';

    this._currentElement = null;


    /* --------------------------------------------------------
       INITIALIZE
       -------------------------------------------------------- */

    this._emit(
      'scene:load',
      {
        scene: nextScene,
      }
    );


    await nextScene.initialize?.(
      context
    );


    /* --------------------------------------------------------
       LOAD ASSETS
       -------------------------------------------------------- */

    await nextScene.loadAssets?.(
      context
    );


    /* --------------------------------------------------------
       ENTER
       -------------------------------------------------------- */

    const element =
      document.createElement('div');

    element.className = 'scene';

    element.dataset.sceneId =
      nextScene.id;

    /*
     * Expose transition metadata to CSS.
     *
     * This gives us a very clean extension point for future
     * transition creativity.
     */
    element.dataset.transition =
      nextTransition.type;

    element.dataset.transitionDirection =
      nextTransition.direction;


    await nextScene.render(
      element,
      context
    );


    this.container.appendChild(
      element
    );

    this._currentElement =
      element;


    this._emit(
      'scene:enter',
      {
        scene: nextScene,
        element,
      }
    );


    await this._runTransition(
      element,
      nextTransition,
      'in'
    );


    /* --------------------------------------------------------
       DISPLAY
       -------------------------------------------------------- */

    this.currentIndex =
      index;

    this.currentScene =
      nextScene;


    this._emit(
      'scene:display',
      {
        scene: nextScene,
        element,
      }
    );


    return nextScene;
  }


  /** @param {number} index */
  async loadScene(index) {
    return this.transitionToScene(index);
  }


  /** @returns {Promise<Object|null>} */
  async nextScene() {
    if (this.getSceneCount() === 0) {
      return null;
    }

    const nextIndex =
      (this.currentIndex + 1) %
      this.getSceneCount();

    return this.transitionToScene(
      nextIndex
    );
  }


  /** @returns {Promise<Object|null>} */
  async previousScene() {
    const count =
      this.getSceneCount();

    if (count === 0) {
      return null;
    }

    const prevIndex =
      (this.currentIndex - 1 + count) %
      count;

    return this.transitionToScene(
      prevIndex
    );
  }


  /** @returns {Promise<Object|null>} */
  async restart() {
    if (this.getSceneCount() === 0) {
      return null;
    }

    return this.transitionToScene(0);
  }


  /* ----------------------------------------------------------
     TRANSITION RUNNER
     ---------------------------------------------------------- */

  /**
   * Runs an enter/exit transition.
   *
   * We deliberately use CSS transition classes here rather than
   * changing any scene's internal animation logic.
   *
   * @param {HTMLElement} element
   * @param {{type:string,direction:string}} transition
   * @param {'in'|'out'} phase
   * @returns {Promise<void>}
   * @private
   */
  async _runTransition(
    element,
    transition,
    phase
  ) {
    if (!element) {
      return;
    }


    const type =
      VALID_TRANSITIONS.has(
        transition?.type
      )
        ? transition.type
        : 'fade';


    const direction =
      transition?.direction ??
      'center';


    /*
     * Respect reduced-motion accessibility.
     */
    if (
      window.matchMedia &&
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
    ) {
      element.style.opacity =
        phase === 'out'
          ? '0'
          : '1';

      return;
    }


    const animationClass =
      `page-transition-${type}-${phase}`;


    element.dataset.transitionDirection =
      direction;


    element.classList.add(
      animationClass
    );


    const duration =
      TRANSITION_DURATION[type] ??
      TRANSITION_DURATION.fade;


    await new Promise(
      (resolve) => {
        let completed = false;


        const finish = () => {
          if (completed) {
            return;
          }

          completed = true;

          element.removeEventListener(
            'animationend',
            finish
          );

          resolve();
        };


        element.addEventListener(
          'animationend',
          finish,
          {
            once: true,
          }
        );


        /*
         * Safety fallback. This prevents the presentation from
         * ever becoming stuck if animationend is interrupted.
         */
        setTimeout(
          finish,
          duration + 100
        );
      }
    );


    element.classList.remove(
      animationClass
    );
  }


  /**
   * @param {string} type
   * @param {Object} detail
   * @private
   */
  _emit(type, detail) {
    this.dispatchEvent(
      new CustomEvent(
        type,
        {
          detail,
        }
      )
    );
  }
}