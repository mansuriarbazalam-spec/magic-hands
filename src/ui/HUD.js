import eventBus from '../core/EventBus.js';

/**
 * HUD — Heads-Up Display.
 *
 * Shows hand count, object count, optional FPS counter, and contextual
 * gesture hints at the bottom of the screen.
 */

export default class HUD {
  constructor() {
    this.handsEl = null;
    this.objectsEl = null;
    this.fpsEl = null;
    this.hintEl = null;

    this.objectCount = 0;
    this.fpsVisible = false;

    // FPS calculation
    this._frameCount = 0;
    this._lastFpsTime = performance.now();
    this._fpsRafId = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Initialization                                                     */
  /* ------------------------------------------------------------------ */

  init() {
    this._buildDOM();
    this._bindEvents();
    this._startFpsLoop();
  }

  /* ------------------------------------------------------------------ */
  /*  DOM Construction                                                   */
  /* ------------------------------------------------------------------ */

  _buildDOM() {
    const overlay = document.getElementById('ui-overlay');

    // ---- HUD panel (top-right) ----
    const hud = document.createElement('div');
    hud.className = 'hud';

    // Hands line
    const handsLine = document.createElement('div');
    handsLine.className = 'hud-line';
    handsLine.innerHTML =
      '<span class="hud-label">HANDS </span>' +
      '<span class="hud-value" id="hud-hands">0</span>';
    hud.appendChild(handsLine);

    // Objects line
    const objLine = document.createElement('div');
    objLine.className = 'hud-line';
    objLine.innerHTML =
      '<span class="hud-label">OBJECTS </span>' +
      '<span class="hud-value" id="hud-objects">0</span>';
    hud.appendChild(objLine);

    // FPS line (hidden by default)
    const fpsLine = document.createElement('div');
    fpsLine.className = 'hud-line hud-fps hidden';
    fpsLine.id = 'hud-fps';
    hud.appendChild(fpsLine);

    overlay.appendChild(hud);

    // ---- Hint bar (bottom-center) ----
    const hint = document.createElement('div');
    hint.className = 'hud-hint';
    hint.id = 'hud-hint';
    hint.textContent = 'Draw a circle to open menu';
    overlay.appendChild(hint);

    // Cache references
    this.handsEl = document.getElementById('hud-hands');
    this.objectsEl = document.getElementById('hud-objects');
    this.fpsEl = document.getElementById('hud-fps');
    this.hintEl = document.getElementById('hud-hint');
  }

  /* ------------------------------------------------------------------ */
  /*  Event Bindings                                                     */
  /* ------------------------------------------------------------------ */

  _bindEvents() {
    // Hand tracking updates
    eventBus.on('hand:update', ({ hands }) => {
      this.handsEl.textContent = hands ? hands.length : 0;
    });

    eventBus.on('hand:lost', () => {
      this.handsEl.textContent = '0';
    });

    // Object tracking
    eventBus.on('object:create', () => {
      this.objectCount++;
      this.objectsEl.textContent = this.objectCount;
    });

    eventBus.on('object:delete', () => {
      this.objectCount = Math.max(0, this.objectCount - 1);
      this.objectsEl.textContent = this.objectCount;
    });

    // When a scene is loaded, reset object count from the loaded data
    eventBus.on('scene:loaded', ({ objects }) => {
      this.objectCount = objects ? objects.length : 0;
      this.objectsEl.textContent = this.objectCount;
    });

    // When scene is cleared
    eventBus.on('scene:new', () => {
      this.objectCount = 0;
      this.objectsEl.textContent = '0';
    });

    // Contextual hints based on menu state
    eventBus.on('menu:toggle', () => {
      // Alternate hint text based on whether the menu just opened
      const menuEl = document.getElementById('side-menu');
      if (menuEl && menuEl.classList.contains('visible')) {
        this.setHint('Point to select \u2022 Pinch to confirm');
      } else {
        this.setHint('Draw a circle to open menu');
      }
    });

    // Toggle FPS counter with 'F' key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        // Don't toggle when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        this.fpsVisible = !this.fpsVisible;
        this.fpsEl.classList.toggle('hidden', !this.fpsVisible);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  FPS Counter                                                        */
  /* ------------------------------------------------------------------ */

  _startFpsLoop() {
    const tick = (now) => {
      this._frameCount++;
      const elapsed = now - this._lastFpsTime;

      if (elapsed >= 1000) {
        const fps = Math.round((this._frameCount * 1000) / elapsed);
        this.fpsEl.textContent = `${fps} FPS`;
        this._frameCount = 0;
        this._lastFpsTime = now;
      }

      this._fpsRafId = requestAnimationFrame(tick);
    };

    this._fpsRafId = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Set the hint text at the bottom of the screen.
   * Pass an empty string or null to hide.
   */
  setHint(text) {
    if (!text) {
      this.hintEl.classList.add('hidden');
    } else {
      this.hintEl.textContent = text;
      this.hintEl.classList.remove('hidden');
    }
  }

  dispose() {
    if (this._fpsRafId) cancelAnimationFrame(this._fpsRafId);
  }
}
