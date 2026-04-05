export default class RotateController {
  constructor(objectManager) {
    this.objectManager = objectManager;
  }

  onRotate(hand, delta, grabController) {
    const objectId = grabController.getGrabbedObjectId(hand);
    if (!objectId) return;
    const obj = this.objectManager.getObjectById(objectId);
    if (!obj) return;
    // Apply rotation to Y axis (horizontal twist feels most intuitive)
    obj.group.rotation.y += delta;
    // Also apply a bit to Z for tilt feel
    obj.group.rotation.z += delta * 0.3;
  }
}
