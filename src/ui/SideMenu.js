import eventBus from '../core/EventBus.js';

const OBJECT_TYPES = ['cube', 'sphere', 'cylinder', 'torus', 'cone', 'plane'];

export default class SideMenu {
  constructor() {
    this.isMenuOpen = false;
    this.menuEl = null;
    this.projectListEl = null;
    this.saveOverlay = null;
    this.saveInput = null;
  }

  init() {
    this._buildMenu();
    this._buildSaveDialog();
    this._bindEvents();
  }

  _buildMenu() {
    const overlay = document.getElementById('ui-overlay');

    const menu = document.createElement('div');
    menu.id = 'side-menu';
    menu.className = 'center-menu';

    const panel = document.createElement('div');
    panel.className = 'menu-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'menu-header';
    header.innerHTML = '<span class="menu-title">MAGIC HANDS</span><span class="menu-subtitle">Pinch to grab &middot; drag to place</span>';
    panel.appendChild(header);

    // Objects Section
    const objectsSection = document.createElement('div');
    objectsSection.className = 'menu-section';
    objectsSection.innerHTML = '<span class="section-title">OBJECTS</span>';

    const grid = document.createElement('div');
    grid.className = 'object-grid';

    OBJECT_TYPES.forEach(type => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.dataset.type = type;
      item.textContent = type;
      grid.appendChild(item);
    });

    objectsSection.appendChild(grid);
    panel.appendChild(objectsSection);

    // Scene Section
    const sceneSection = document.createElement('div');
    sceneSection.className = 'menu-section';
    sceneSection.innerHTML = '<span class="section-title">SCENE</span>';

    const controls = document.createElement('div');
    controls.className = 'scene-controls';

    ['new', 'save', 'load'].forEach(action => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.dataset.action = action;
      item.textContent = action;
      controls.appendChild(item);
    });

    sceneSection.appendChild(controls);
    panel.appendChild(sceneSection);

    // Project List
    const projectList = document.createElement('div');
    projectList.className = 'project-list hidden';
    panel.appendChild(projectList);

    menu.appendChild(panel);
    overlay.appendChild(menu);

    this.menuEl = menu;
    this.projectListEl = projectList;
  }

  _buildSaveDialog() {
    const overlay = document.getElementById('ui-overlay');

    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'save-dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'save-dialog';

    const title = document.createElement('div');
    title.className = 'save-dialog-title';
    title.textContent = 'SAVE PROJECT';

    const input = document.createElement('input');
    input.className = 'save-dialog-input';
    input.type = 'text';
    input.placeholder = 'Project name...';
    input.maxLength = 64;

    const buttons = document.createElement('div');
    buttons.className = 'save-dialog-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'save-dialog-btn';
    cancelBtn.textContent = 'CANCEL';
    cancelBtn.addEventListener('click', () => this._hideSaveDialog());

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-dialog-btn primary';
    saveBtn.textContent = 'SAVE';
    saveBtn.addEventListener('click', () => this._confirmSave());

    buttons.appendChild(cancelBtn);
    buttons.appendChild(saveBtn);

    dialog.appendChild(title);
    dialog.appendChild(input);
    dialog.appendChild(buttons);
    dialogOverlay.appendChild(dialog);

    dialogOverlay.addEventListener('click', (e) => {
      if (e.target === dialogOverlay) this._hideSaveDialog();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._confirmSave();
      if (e.key === 'Escape') this._hideSaveDialog();
    });

    overlay.appendChild(dialogOverlay);
    this.saveOverlay = dialogOverlay;
    this.saveInput = input;
  }

  _bindEvents() {
    eventBus.on('menu:toggle', () => this._toggle());
    eventBus.on('menu:hover', (data) => this._handleHover(data));
    eventBus.on('menu:select', (data) => this._handleSelect(data));
    eventBus.on('menu:closed', () => {
      // Sync state if closed externally
      this.isMenuOpen = false;
      this.menuEl.classList.remove('visible');
      this.projectListEl.classList.add('hidden');
    });

    // Mouse click fallback
    this.menuEl.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item');
      if (!item) return;
      const identifier = item.dataset.type || item.dataset.action;
      if (identifier) {
        eventBus.emit('menu:select', { item: identifier });
      }
    });
  }

  _toggle() {
    this.isMenuOpen = !this.isMenuOpen;
    this.menuEl.classList.toggle('visible', this.isMenuOpen);

    if (!this.isMenuOpen) {
      this.projectListEl.classList.add('hidden');
      this._hideSaveDialog();
    }
  }

  isOpen() {
    return this.isMenuOpen;
  }

  _handleHover({ item }) {
    const items = this.menuEl.querySelectorAll('.menu-item');
    items.forEach(el => el.classList.remove('hovered'));
    const projectItems = this.menuEl.querySelectorAll('.project-item');
    projectItems.forEach(el => el.classList.remove('hovered'));

    if (!item) return;

    const match = this.menuEl.querySelector(
      `.menu-item[data-type="${item}"], .menu-item[data-action="${item}"]`
    );
    if (match) { match.classList.add('hovered'); return; }

    if (item.startsWith('project:')) {
      const name = item.slice(8);
      const pItem = this.menuEl.querySelector(`.project-item[data-name="${name}"]`);
      if (pItem) pItem.classList.add('hovered');
    }
  }

  _handleSelect({ item }) {
    if (OBJECT_TYPES.includes(item)) {
      eventBus.emit('object:create', { type: item, position: { x: 0, y: 0, z: 0 } });
      this._close();
      return;
    }

    switch (item) {
      case 'new':
        eventBus.emit('scene:new', {});
        this._close();
        break;
      case 'save':
        this._showSaveDialog();
        break;
      case 'load':
        this._showProjectList();
        break;
      default:
        if (item.startsWith('project:')) {
          eventBus.emit('scene:load', { name: item.slice(8) });
          this._close();
        }
        break;
    }
  }

  _showSaveDialog() {
    this.saveInput.value = '';
    this.saveOverlay.classList.add('visible');
    requestAnimationFrame(() => this.saveInput.focus());
  }

  _hideSaveDialog() {
    this.saveOverlay.classList.remove('visible');
  }

  _confirmSave() {
    const name = this.saveInput.value.trim();
    if (!name) return;
    eventBus.emit('scene:save', { name });
    this._hideSaveDialog();
    this._close();
  }

  showProjectList(projects) {
    this._showProjectList(projects);
  }

  _showProjectList(projects) {
    const list = this.projectListEl;
    list.innerHTML = '';

    const title = document.createElement('span');
    title.className = 'project-list-title';
    title.textContent = 'SAVED PROJECTS';
    list.appendChild(title);

    if (!projects || projects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'project-list-empty';
      empty.textContent = 'No saved projects';
      list.appendChild(empty);
    } else {
      projects.forEach(name => {
        const row = document.createElement('div');
        row.className = 'project-item';
        row.dataset.name = name;
        const label = document.createElement('span');
        label.textContent = name;
        const del = document.createElement('span');
        del.className = 'delete-btn';
        del.textContent = '[X]';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          eventBus.emit('project:delete', { name });
          row.remove();
        });
        row.appendChild(label);
        row.appendChild(del);
        row.addEventListener('click', () => {
          eventBus.emit('menu:select', { item: `project:${name}` });
        });
        list.appendChild(row);
      });
    }

    list.classList.remove('hidden');
  }

  _close() {
    if (this.isMenuOpen) {
      this.isMenuOpen = false;
      this.menuEl.classList.remove('visible');
      this.projectListEl.classList.add('hidden');
      // CRITICAL: notify all listeners that menu is closed
      eventBus.emit('menu:closed', {});
    }
  }
}
