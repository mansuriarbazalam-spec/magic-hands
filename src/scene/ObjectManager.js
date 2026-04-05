import eventBus from '../core/EventBus.js';
import { createPrimitive } from './ObjectFactory.js';
import { GRAB_RADIUS } from '../utils/Constants.js';

export default class ObjectManager {
  constructor(scene) {
    this.scene = scene;           // THREE.Scene reference
    this.objects = new Map();     // id -> primitive instance
    this.selectedId = null;

    // Listen for events
    eventBus.on('object:create', ({ type, position }) => this.createObject(type, position));
    eventBus.on('object:delete', ({ objectId }) => this.deleteObject(objectId));
    eventBus.on('scene:new', () => this.clearAll());
    eventBus.on('scene:loaded', ({ objects }) => this.loadState(objects));
  }

  createObject(type, position = { x: 0, y: 0, z: 0 }) {
    const obj = createPrimitive(type, position);
    this.objects.set(obj.id, obj);
    this.scene.add(obj.group);
    return obj;
  }

  deleteObject(id) {
    const obj = this.objects.get(id);
    if (!obj) return;
    this.scene.remove(obj.group);
    obj.dispose();
    this.objects.delete(id);
    if (this.selectedId === id) this.selectedId = null;
  }

  clearAll() {
    for (const [id] of this.objects) {
      this.deleteObject(id);
    }
  }

  getObjectById(id) {
    return this.objects.get(id) || null;
  }

  getObjectAtPosition(worldPos, radius = GRAB_RADIUS) {
    // Use 2D distance (X/Y only) — Z depth from hand tracking is unreliable
    let nearest = null, minDist = radius;
    for (const [id, obj] of this.objects) {
      const pos = obj.group.position;
      const dist = Math.sqrt(
        (pos.x - worldPos.x) ** 2 +
        (pos.y - worldPos.y) ** 2
      );
      if (dist < minDist) {
        nearest = obj;
        minDist = dist;
      }
    }
    return nearest;
  }

  setSelected(id) {
    if (this.selectedId) {
      this.objects.get(this.selectedId)?.setSelected(false);
    }
    this.selectedId = id;
    if (id) this.objects.get(id)?.setSelected(true);
  }

  update(time) {
    for (const [, obj] of this.objects) {
      obj.update(time);
    }
  }

  getSerializableState() {
    const result = [];
    for (const [, obj] of this.objects) {
      result.push({
        type: obj.type,
        position: { x: obj.group.position.x, y: obj.group.position.y, z: obj.group.position.z },
        rotation: { x: obj.group.rotation.x, y: obj.group.rotation.y, z: obj.group.rotation.z },
        scale: { x: obj.group.scale.x, y: obj.group.scale.y, z: obj.group.scale.z }
      });
    }
    return result;
  }

  loadState(objectDescriptors) {
    this.clearAll();
    for (const desc of objectDescriptors) {
      const obj = this.createObject(desc.type, desc.position);
      if (desc.rotation) {
        obj.group.rotation.set(desc.rotation.x, desc.rotation.y, desc.rotation.z);
      }
      if (desc.scale) {
        obj.group.scale.set(desc.scale.x, desc.scale.y, desc.scale.z);
      }
    }
  }

  getAllMeshes() {
    // Return array of all mesh groups (for raycasting)
    const meshes = [];
    for (const [, obj] of this.objects) {
      meshes.push(obj.group);
    }
    return meshes;
  }
}
