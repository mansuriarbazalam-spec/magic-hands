import * as THREE from 'three';

export default class SceneRaycaster {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  pickFromScreen(screenX, screenY, camera, objectGroups) {
    this.mouse.set(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObjects(objectGroups, true);
    return intersects.length > 0 ? intersects[0] : null;
  }

  pickFromWorldPosition(worldPos, objectGroups, radius = 0.8) {
    let nearest = null, minDist = radius;
    for (const group of objectGroups) {
      const dist = group.position.distanceTo(
        new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
      );
      if (dist < minDist) {
        nearest = group;
        minDist = dist;
      }
    }
    return nearest;
  }
}
