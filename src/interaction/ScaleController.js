import { MIN_SCALE, MAX_SCALE } from '../utils/Constants.js';

export default class ScaleController {
  constructor(objectManager) {
    this.objectManager = objectManager;
  }

  onScale(delta, grabController) {
    // Scale all currently grabbed objects
    for (const hand of ['left', 'right']) {
      const objectId = grabController.getGrabbedObjectId(hand);
      if (!objectId) continue;
      const obj = this.objectManager.getObjectById(objectId);
      if (!obj) continue;

      const scaleFactor = 1 + delta * 0.5;
      const newScaleX = obj.group.scale.x * scaleFactor;
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScaleX));
      obj.group.scale.setScalar(clampedScale);
      break; // Only scale one object
    }
  }
}
