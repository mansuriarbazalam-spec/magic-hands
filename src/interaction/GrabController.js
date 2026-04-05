import coordinateMapper from '../core/CoordinateMapper.js';
import eventBus from '../core/EventBus.js';

export default class GrabController {
  constructor(objectManager) {
    this.objectManager = objectManager;
    this.grabbedObjects = new Map(); // hand → { objectId, offset: {x,y,z} }
  }

  onPinchStart(hand, position) {
    const worldPos = coordinateMapper.toThreeJS(position);
    const obj = this.objectManager.getObjectAtPosition(worldPos);
    if (obj) {
      const offset = {
        x: obj.group.position.x - worldPos.x,
        y: obj.group.position.y - worldPos.y,
        z: obj.group.position.z - worldPos.z
      };
      this.grabbedObjects.set(hand, { objectId: obj.id, offset });
      obj.setSelected(true);
      eventBus.emit('object:grab', { objectId: obj.id, hand });
    }
  }

  onPinchHold(hand, position) {
    const grabbed = this.grabbedObjects.get(hand);
    if (!grabbed) return;
    const obj = this.objectManager.getObjectById(grabbed.objectId);
    if (!obj) return;
    const worldPos = coordinateMapper.toThreeJS(position);
    obj.group.position.set(
      worldPos.x + grabbed.offset.x,
      worldPos.y + grabbed.offset.y,
      worldPos.z + grabbed.offset.z
    );
  }

  onPinchEnd(hand) {
    const grabbed = this.grabbedObjects.get(hand);
    if (!grabbed) return;
    const obj = this.objectManager.getObjectById(grabbed.objectId);
    if (obj) obj.setSelected(false);
    eventBus.emit('object:release', { objectId: grabbed.objectId });
    this.grabbedObjects.delete(hand);
  }

  isGrabbing(hand) {
    return this.grabbedObjects.has(hand);
  }

  getGrabbedObjectId(hand) {
    return this.grabbedObjects.get(hand)?.objectId || null;
  }

  releaseAll() {
    for (const [hand, grabbed] of this.grabbedObjects) {
      const obj = this.objectManager.getObjectById(grabbed.objectId);
      if (obj) obj.setSelected(false);
      eventBus.emit('object:release', { objectId: grabbed.objectId });
    }
    this.grabbedObjects.clear();
  }
}
