import eventBus from '../core/EventBus.js';

/**
 * MenuPointer — Finger-cursor that appears when the side menu is open.
 *
 * Uses bounding-box hit-testing against menu items (not elementFromPoint)
 * for reliable hover detection regardless of z-index or pointer-events.
 */

export default class MenuPointer {
  constructor(sideMenu) {
    this.sideMenu = sideMenu;
    this.cursorEl = null;
    this.hoveredItem = null;
    this.menuOpen = false;
    this.lastPointFrame = 0;
    this.frameCount = 0;
  }

  init() {
    this._buildCursor();
    this._bindEvents();
  }

  _buildCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'finger-cursor';
    document.getElementById('ui-overlay').appendChild(cursor);
    this.cursorEl = cursor;
  }

  _bindEvents() {
    eventBus.on('menu:toggle', () => {
      this.menuOpen = !this.menuOpen;
      if (this.menuOpen) {
        this.cursorEl.classList.add('active');
      } else {
        this._hideAndClear();
      }
    });

    // Also handle explicit close from SideMenu._close()
    eventBus.on('menu:closed', () => {
      this.menuOpen = false;
      this._hideAndClear();
    });

    eventBus.on('gesture:point', (data) => this._onPoint(data));
    eventBus.on('hand:update', (data) => this._onHandUpdate(data));
    eventBus.on('gesture:pinch', (data) => this._onPinch(data));

    eventBus.on('hand:lost', () => {
      this.cursorEl.classList.remove('active');
      this._clearHover();
    });
  }

  _onPoint({ screenPosition }) {
    if (!this.menuOpen) return;
    this.lastPointFrame = this.frameCount;
    this._moveCursor(screenPosition.x, screenPosition.y);
  }

  _onHandUpdate({ hands }) {
    if (!this.menuOpen) return;
    if (!hands || hands.length === 0) return;
    this.frameCount++;
    if (this.lastPointFrame === this.frameCount) return;

    const indexTip = hands[0].landmarks[8];
    const x = (1 - indexTip.x) * window.innerWidth;
    const y = indexTip.y * window.innerHeight;
    this._moveCursor(x, y);
  }

  _moveCursor(x, y) {
    this.cursorEl.style.left = `${x}px`;
    this.cursorEl.style.top = `${y}px`;
    this.cursorEl.classList.add('active');

    // Hit-test using bounding boxes of all menu items
    const menuEl = document.getElementById('side-menu');
    if (!menuEl) return;

    const items = menuEl.querySelectorAll('.menu-item, .project-item');
    let found = null;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        if (item.classList.contains('menu-item')) {
          found = item.dataset.type || item.dataset.action || null;
        } else if (item.classList.contains('project-item')) {
          found = item.dataset.name ? `project:${item.dataset.name}` : null;
        }
        break;
      }
    }

    this._setHover(found);
  }

  _onPinch({ state }) {
    if (!this.menuOpen) return;

    if (state === 'start') {
      this.cursorEl.classList.add('pinching');
      if (this.hoveredItem) {
        eventBus.emit('menu:select', { item: this.hoveredItem });
      }
    }

    if (state === 'end') {
      this.cursorEl.classList.remove('pinching');
    }
  }

  _setHover(item) {
    if (item === this.hoveredItem) return;
    this.hoveredItem = item;
    eventBus.emit('menu:hover', { item });
  }

  _hideAndClear() {
    this.cursorEl.classList.remove('active');
    this.cursorEl.classList.remove('pinching');
    this._clearHover();
  }

  _clearHover() {
    if (this.hoveredItem !== null) {
      this.hoveredItem = null;
      eventBus.emit('menu:hover', { item: null });
    }
  }
}
