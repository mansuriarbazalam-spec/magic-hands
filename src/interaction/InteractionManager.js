import eventBus from '../core/EventBus.js';
import coordinateMapper from '../core/CoordinateMapper.js';
import GrabController from './GrabController.js';
import RotateController from './RotateController.js';
import ScaleController from './ScaleController.js';
import DeleteController from './DeleteController.js';
import { MIN_SCALE, MAX_SCALE } from '../utils/Constants.js';

export default class InteractionManager {
  constructor(objectManager, sceneManager) {
    this.objectManager = objectManager;
    this.sceneManager = sceneManager;
    this.isMenuOpen = false;
    this.isScaling = false;

    this.grabController = new GrabController(objectManager);
    this.rotateController = new RotateController(objectManager);
    this.scaleController = new ScaleController(objectManager);
    this.deleteController = new DeleteController(objectManager);

    this.lastHandPosition = { left: null, right: null };
    this.lastHandLandmarks = { left: null, right: null };
    this.fistGrabbedObjects = new Map();

    // Two-open-hands move state
    this.twoHandMoveTarget = null;    // objectId being moved by open hands
    this.prevMidpoint = null;         // previous frame midpoint for delta

    // Two-hand pinch rotation tracking
    this.prevPinchAngle = null;       // angle between the two pinch points
    this.prevPinchMidpoint = null;    // midpoint between pinch points
  }

  init() {
    eventBus.on('menu:toggle', () => {
      this.isMenuOpen = !this.isMenuOpen;
      if (this.isMenuOpen) {
        this.grabController.releaseAll();
        this._releaseAllFist();
        this.twoHandMoveTarget = null;
      }
    });

    eventBus.on('menu:closed', () => { this.isMenuOpen = false; });

    eventBus.on('gesture:pinch', (data) => this.onPinch(data));
    eventBus.on('gesture:scale', (data) => this.onScale(data));
    eventBus.on('gesture:swipe', (data) => this.onSwipe(data));
    eventBus.on('gesture:point', (data) => this.onPoint(data));
    eventBus.on('gesture:triangle', () => this.onTriangle());
    eventBus.on('gesture:fist', (data) => this.onFist(data));

    eventBus.on('hand:update', ({ hands }) => {
      const handMap = {};
      for (const hand of hands) {
        const key = hand.handedness.toLowerCase();
        this.lastHandPosition[key] = hand.landmarks[9];
        this.lastHandLandmarks[key] = hand.landmarks;
        handMap[key] = hand;
      }

      // Two-open-hands move detection
      if (!this.isMenuOpen) {
        this._handleTwoHandMove(handMap);
      }
    });

    eventBus.on('hand:lost', ({ handedness }) => {
      const hand = handedness.toLowerCase();
      this.lastHandPosition[hand] = null;
      this.lastHandLandmarks[hand] = null;
      if (this.grabController.isGrabbing(hand)) this.grabController.onPinchEnd(hand);
      this._releaseFist(hand);
      this.twoHandMoveTarget = null;
      this.prevMidpoint = null;
    });

    eventBus.on('object:create', () => {
      requestAnimationFrame(() => this._handleAutoGrab());
    });
  }

  // ─── TWO OPEN HANDS = MOVE OBJECT ──────────────────────────────
  _handleTwoHandMove(handMap) {
    const leftLm = this.lastHandLandmarks.left;
    const rightLm = this.lastHandLandmarks.right;

    // Need both hands visible
    if (!leftLm || !rightLm) {
      this._endTwoHandMove();
      return;
    }

    // Check if either hand is in fist or pinch — if so, don't do open-hand move
    const anyFist = this.fistGrabbedObjects.size > 0;
    const anyPinch = this.grabController.isGrabbing('left') || this.grabController.isGrabbing('right');
    if (anyFist || anyPinch || this.isScaling) {
      this._endTwoHandMove();
      return;
    }

    // Check both hands are OPEN (at least 3 fingers extended)
    const leftOpen = this._isHandOpen(leftLm);
    const rightOpen = this._isHandOpen(rightLm);

    if (!leftOpen || !rightOpen) {
      this._endTwoHandMove();
      return;
    }

    // Compute midpoint of both palms
    const leftPalm = this._palmCenter(leftLm);
    const rightPalm = this._palmCenter(rightLm);
    const mid = {
      x: (leftPalm.x + rightPalm.x) / 2,
      y: (leftPalm.y + rightPalm.y) / 2,
      z: (leftPalm.z + rightPalm.z) / 2
    };
    const worldMid = coordinateMapper.toThreeJS(mid);

    if (!this.twoHandMoveTarget) {
      // Find nearest object to midpoint
      const obj = this.objectManager.getObjectAtPosition(worldMid);
      if (obj) {
        this.twoHandMoveTarget = obj.id;
        obj.setSelected(true);
      }
    }

    if (this.twoHandMoveTarget && this.prevMidpoint) {
      const obj = this.objectManager.getObjectById(this.twoHandMoveTarget);
      if (obj) {
        const prevWorld = coordinateMapper.toThreeJS(this.prevMidpoint);
        obj.group.position.x += worldMid.x - prevWorld.x;
        obj.group.position.y += worldMid.y - prevWorld.y;
      }
    }

    this.prevMidpoint = { ...mid };
  }

  _endTwoHandMove() {
    if (this.twoHandMoveTarget) {
      const obj = this.objectManager.getObjectById(this.twoHandMoveTarget);
      if (obj) obj.setSelected(false);
    }
    this.twoHandMoveTarget = null;
    this.prevMidpoint = null;
  }

  _isHandOpen(landmarks) {
    const wrist = landmarks[0];
    const fingers = [
      { tip: 8, pip: 6 },
      { tip: 12, pip: 10 },
      { tip: 16, pip: 14 },
      { tip: 20, pip: 18 }
    ];
    let extended = 0;
    for (const { tip, pip } of fingers) {
      const tipD = Math.sqrt(
        (landmarks[tip].x - wrist.x) ** 2 +
        (landmarks[tip].y - wrist.y) ** 2 +
        (landmarks[tip].z - wrist.z) ** 2
      );
      const pipD = Math.sqrt(
        (landmarks[pip].x - wrist.x) ** 2 +
        (landmarks[pip].y - wrist.y) ** 2 +
        (landmarks[pip].z - wrist.z) ** 2
      );
      if (tipD > pipD * 1.0) extended++;
    }
    return extended >= 3;
  }

  _palmCenter(landmarks) {
    const indices = [0, 5, 9, 13, 17];
    const c = { x: 0, y: 0, z: 0 };
    for (const i of indices) {
      c.x += landmarks[i].x;
      c.y += landmarks[i].y;
      c.z += landmarks[i].z;
    }
    c.x /= indices.length;
    c.y /= indices.length;
    c.z /= indices.length;
    return c;
  }

  // ─── AUTO GRAB FROM MENU ───────────────────────────────────────
  _handleAutoGrab() {
    let lastObj = null;
    for (const [, obj] of this.objectManager.objects) lastObj = obj;
    if (!lastObj) return;

    const handPos = this.lastHandPosition.right || this.lastHandPosition.left;
    if (handPos) {
      const worldPos = coordinateMapper.toThreeJS(handPos);
      lastObj.group.position.set(worldPos.x, worldPos.y, worldPos.z);
      const hand = this.lastHandPosition.right ? 'right' : 'left';
      this.grabController.grabbedObjects.set(hand, {
        objectId: lastObj.id, offset: { x: 0, y: 0, z: 0 }
      });
      lastObj.setSelected(true);
      eventBus.emit('object:grab', { objectId: lastObj.id, hand });
    }
  }

  // ─── PINCH: menu drag-drop + single-hand grab ─────────────────
  onPinch({ hand, position, state }) {
    if (this.isMenuOpen) return;

    switch (state) {
      case 'start':
        this.grabController.onPinchStart(hand, position);
        break;
      case 'hold':
        if (!this.isScaling) {
          this.grabController.onPinchHold(hand, position);
        }
        break;
      case 'end':
        this.isScaling = false;
        this.prevPinchAngle = null;
        this.prevPinchMidpoint = null;
        this.grabController.onPinchEnd(hand);
        break;
    }
  }

  // ─── FIST: grab + rotate (virtual trackball) ──────────────────
  onFist({ hand, state, worldPosition, rotationX, rotationY }) {
    if (this.isMenuOpen) return;

    if (state === 'grab') {
      const obj = this.objectManager.getObjectAtPosition(worldPosition);
      if (obj && !this._isObjectGrabbed(obj.id)) {
        this.fistGrabbedObjects.set(hand, {
          objectId: obj.id,
          lockedPosition: {
            x: obj.group.position.x,
            y: obj.group.position.y,
            z: obj.group.position.z
          }
        });
        obj.setSelected(true);
        eventBus.emit('object:grab', { objectId: obj.id, hand });
      }
    } else if (state === 'hold') {
      const grabbed = this.fistGrabbedObjects.get(hand);
      if (!grabbed) return;
      const obj = this.objectManager.getObjectById(grabbed.objectId);
      if (!obj) return;

      obj.group.position.set(
        grabbed.lockedPosition.x,
        grabbed.lockedPosition.y,
        grabbed.lockedPosition.z
      );
      obj.group.rotation.y += rotationY;
      obj.group.rotation.x += rotationX;
    } else if (state === 'release') {
      this._releaseFist(hand);
    }
  }

  // ─── TWO-HAND SCALE + ROTATE ──────────────────────────────────
  onScale({ delta }) {
    if (this.isMenuOpen) return;
    this.isScaling = true;

    // Find target object
    let targetObj = this._findScaleTarget();
    if (!targetObj) return;

    // Apply scale
    const scaleFactor = 1 + delta * 0.5;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetObj.group.scale.x * scaleFactor));
    targetObj.group.scale.setScalar(newScale);

    // Also apply rotation from the angle between the two pinch points
    const leftLm = this.lastHandLandmarks.left;
    const rightLm = this.lastHandLandmarks.right;
    if (leftLm && rightLm) {
      // Pinch midpoints
      const leftPinch = {
        x: (leftLm[4].x + leftLm[8].x) / 2,
        y: (leftLm[4].y + leftLm[8].y) / 2
      };
      const rightPinch = {
        x: (rightLm[4].x + rightLm[8].x) / 2,
        y: (rightLm[4].y + rightLm[8].y) / 2
      };

      // Angle of line between both pinch points
      const angle = Math.atan2(rightPinch.y - leftPinch.y, rightPinch.x - leftPinch.x);

      // Midpoint vertical movement → X rotation
      const midY = (leftPinch.y + rightPinch.y) / 2;

      if (this.prevPinchAngle !== null) {
        let angleDelta = angle - this.prevPinchAngle;
        if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
        if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

        // Clamp
        angleDelta = Math.max(-0.1, Math.min(0.1, angleDelta));

        // Apply rotation: tilt angle → Z rotation, vertical movement → X rotation
        targetObj.group.rotation.z += angleDelta * 3;

        if (this.prevPinchMidpoint !== null) {
          const midDeltaY = midY - this.prevPinchMidpoint;
          targetObj.group.rotation.x += Math.max(-0.1, Math.min(0.1, midDeltaY * 5));
        }
        this.prevPinchMidpoint = midY;
      }
      this.prevPinchAngle = angle;
    }
  }

  _findScaleTarget() {
    let target = null;
    for (const hand of ['left', 'right']) {
      const id = this.grabController.getGrabbedObjectId(hand);
      if (id) { target = this.objectManager.getObjectById(id); break; }
    }
    if (!target) {
      for (const [, grabbed] of this.fistGrabbedObjects) {
        target = this.objectManager.getObjectById(grabbed.objectId);
        if (target) break;
      }
    }
    if (!target) {
      for (const hand of ['left', 'right']) {
        const pos = this.lastHandPosition[hand];
        if (pos) {
          const wp = coordinateMapper.toThreeJS(pos);
          target = this.objectManager.getObjectAtPosition(wp);
          if (target) break;
        }
      }
    }
    return target;
  }

  // ─── OTHER GESTURES ────────────────────────────────────────────
  onRotate({ hand, delta }) {
    if (this.isMenuOpen) return;
    this.rotateController.onRotate(hand, delta, this.grabController);
  }

  onSwipe({ hand, direction, velocity }) {
    if (this.isMenuOpen) return;
    this.deleteController.onSwipe(hand, direction, velocity, this.grabController);
  }

  onPoint({ hand, worldPosition }) {
    if (this.isMenuOpen) return;
    const obj = this.objectManager.getObjectAtPosition(worldPosition);
    const hoveredId = obj ? obj.id : null;
    const anyGrab = this.grabController.isGrabbing('left') ||
                    this.grabController.isGrabbing('right') ||
                    this.fistGrabbedObjects.size > 0 ||
                    this.twoHandMoveTarget;
    if (!anyGrab) this.objectManager.setSelected(hoveredId);
  }

  onTriangle() { eventBus.emit('menu:toggle', {}); }

  // ─── HELPERS ───────────────────────────────────────────────────
  _releaseFist(hand) {
    const grabbed = this.fistGrabbedObjects.get(hand);
    if (!grabbed) return;
    const obj = this.objectManager.getObjectById(grabbed.objectId);
    if (obj) obj.setSelected(false);
    eventBus.emit('object:release', { objectId: grabbed.objectId });
    this.fistGrabbedObjects.delete(hand);
  }

  _releaseAllFist() {
    for (const [hand] of this.fistGrabbedObjects) this._releaseFist(hand);
  }

  _isObjectGrabbed(objId) {
    for (const [, data] of this.grabController.grabbedObjects) {
      if (data.objectId === objId) return true;
    }
    for (const [, grabbed] of this.fistGrabbedObjects) {
      if (grabbed.objectId === objId) return true;
    }
    return false;
  }
}
