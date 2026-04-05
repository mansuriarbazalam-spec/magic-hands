/**
 * SceneSerializer — Converts scene state to/from a JSON-safe format.
 *
 * The serialized envelope contains a version number so future code can
 * migrate older save files gracefully.
 */

const CURRENT_VERSION = 1;

export default class SceneSerializer {
  /**
   * Serialize the current scene into a storable object.
   *
   * @param {object} objectManager  Must expose `getSerializableState()` which
   *   returns an array of plain object descriptors.
   * @returns {{ version: number, timestamp: string, objects: object[] }}
   */
  serialize(objectManager) {
    const objects = objectManager && typeof objectManager.getSerializableState === 'function'
      ? objectManager.getSerializableState()
      : [];

    return {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      objects,
    };
  }

  /**
   * Deserialize a stored JSON blob back into an objects array.
   *
   * @param {object|string} json  Either a parsed object or a JSON string.
   * @returns {object[]}  Array of object descriptors, or empty array on error.
   */
  deserialize(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;

      if (!data || typeof data !== 'object') {
        console.warn('[SceneSerializer] Invalid data format');
        return [];
      }

      // Version gate — currently only v1
      if (data.version !== CURRENT_VERSION) {
        console.warn(`[SceneSerializer] Unknown version: ${data.version}`);
        // Attempt best-effort: still return objects if present
      }

      if (!Array.isArray(data.objects)) {
        console.warn('[SceneSerializer] Missing objects array');
        return [];
      }

      return data.objects;
    } catch (err) {
      console.error('[SceneSerializer] Deserialization failed:', err);
      return [];
    }
  }
}
