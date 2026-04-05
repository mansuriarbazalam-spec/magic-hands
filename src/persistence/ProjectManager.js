import eventBus from '../core/EventBus.js';
import StorageManager from './StorageManager.js';
import SceneSerializer from './SceneSerializer.js';

/**
 * ProjectManager — Orchestrates save / load / new project lifecycle.
 *
 * Listens to EventBus events emitted by the UI layer and delegates to
 * StorageManager (localStorage) and SceneSerializer (data transform).
 */

export default class ProjectManager {
  /**
   * @param {object} objectManager  The scene's ObjectManager instance.
   *   Must expose `getSerializableState()` for saving and
   *   a way to restore state (handled by the consumer of `scene:loaded`).
   */
  constructor(objectManager) {
    this.objectManager = objectManager;
    this.storage = new StorageManager();
    this.serializer = new SceneSerializer();
    this.currentProject = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Initialization                                                     */
  /* ------------------------------------------------------------------ */

  init() {
    this._bindEvents();
  }

  /* ------------------------------------------------------------------ */
  /*  Event Bindings                                                     */
  /* ------------------------------------------------------------------ */

  _bindEvents() {
    eventBus.on('scene:save', ({ name }) => this.saveProject(name));
    eventBus.on('scene:load', ({ name }) => this.loadProject(name));
    eventBus.on('scene:new', () => this.newProject());

    // Handle project deletion from the UI
    eventBus.on('project:delete', ({ name }) => this.deleteProject(name));
  }

  /* ------------------------------------------------------------------ */
  /*  Project Operations                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Serialize the current scene and persist it under the given name.
   * @param {string} name
   */
  saveProject(name) {
    if (!name) {
      console.warn('[ProjectManager] Cannot save without a name');
      return;
    }

    const data = this.serializer.serialize(this.objectManager);
    this.storage.save(name, data);
    this.currentProject = name;

    console.log(`[ProjectManager] Saved project: "${name}"`);
  }

  /**
   * Load a project from storage and emit the deserialized objects.
   * @param {string} name
   */
  loadProject(name) {
    if (!name) {
      console.warn('[ProjectManager] Cannot load without a name');
      return;
    }

    const data = this.storage.load(name);
    if (!data) {
      console.warn(`[ProjectManager] Project not found: "${name}"`);
      return;
    }

    const objects = this.serializer.deserialize(data);
    this.currentProject = name;

    console.log(`[ProjectManager] Loaded project: "${name}" (${objects.length} objects)`);

    eventBus.emit('scene:loaded', { objects });
  }

  /**
   * Start a fresh scene — clear current project reference and notify.
   */
  newProject() {
    this.currentProject = null;
    console.log('[ProjectManager] New project started');
    // scene:new is already emitted by the caller; downstream listeners
    // (ObjectManager, HUD, etc.) handle clearing their own state.
  }

  /**
   * Return a sorted list of saved project names.
   * @returns {string[]}
   */
  listProjects() {
    return this.storage.list();
  }

  /**
   * Remove a project from storage.
   * @param {string} name
   */
  deleteProject(name) {
    this.storage.delete(name);

    if (this.currentProject === name) {
      this.currentProject = null;
    }

    console.log(`[ProjectManager] Deleted project: "${name}"`);
  }

  /**
   * Get the name of the currently loaded project, if any.
   * @returns {string|null}
   */
  getCurrentProject() {
    return this.currentProject;
  }
}
