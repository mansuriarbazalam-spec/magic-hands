import eventBus from '../core/EventBus.js';
import { DELETE_VELOCITY } from '../utils/Constants.js';

export default class DeleteController {
  constructor(objectManager) {
    this.objectManager = objectManager;
  }

  onSwipe(hand, direction, velocity, grabController) {
    if (!grabController.isGrabbing(hand)) return;
    if (velocity < DELETE_VELOCITY) return;

    const objectId = grabController.getGrabbedObjectId(hand);
    if (!objectId) return;

    // Delete the object
    eventBus.emit('object:delete', { objectId });
    // Clean up grab state
    grabController.grabbedObjects.delete(hand);
  }
}
