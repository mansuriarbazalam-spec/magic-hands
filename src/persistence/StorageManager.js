/**
 * StorageManager — localStorage wrapper for project persistence.
 *
 * All keys are prefixed with `magic-hands:project:` to avoid collisions
 * with other apps sharing the same origin.
 */

const PREFIX = 'magic-hands:project:';

export default class StorageManager {
  /**
   * Save a project.
   * @param {string} name     Project name (used as key suffix).
   * @param {object} data     Serializable project data.
   */
  save(name, data) {
    const key = PREFIX + name;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error('[StorageManager] Failed to save:', err);
    }
  }

  /**
   * Load a project by name.
   * @param {string} name
   * @returns {object|null}  Parsed data or null if not found / corrupt.
   */
  load(name) {
    const key = PREFIX + name;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('[StorageManager] Failed to load:', err);
      return null;
    }
  }

  /**
   * Delete a saved project.
   * @param {string} name
   */
  delete(name) {
    const key = PREFIX + name;
    localStorage.removeItem(key);
  }

  /**
   * List all saved project names.
   * @returns {string[]}
   */
  list() {
    const names = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        names.push(key.slice(PREFIX.length));
      }
    }
    return names.sort();
  }

  /**
   * Check whether a project with the given name exists.
   * @param {string} name
   * @returns {boolean}
   */
  exists(name) {
    return localStorage.getItem(PREFIX + name) !== null;
  }
}
