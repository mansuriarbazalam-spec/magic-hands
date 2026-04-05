import eventBus from '../core/EventBus.js';
import GestureConfig from './GestureConfig.js';
import PinchDetector from './detectors/PinchDetector.js';
import RotateDetector from './detectors/RotateDetector.js';
import ScaleDetector from './detectors/ScaleDetector.js';
import SwipeDetector from './detectors/SwipeDetector.js';
import TriangleDetector from './detectors/TriangleDetector.js';
import PointDetector from './detectors/PointDetector.js';
import PalmGrabDetector from './detectors/PalmGrabDetector.js';

export default class GestureEngine {
  constructor() {
    this.pinchDetector = new PinchDetector(GestureConfig.pinch);
    this.rotateDetector = new RotateDetector(GestureConfig.rotate);
    this.scaleDetector = new ScaleDetector(GestureConfig.scale);
    this.swipeDetector = new SwipeDetector(GestureConfig.swipe);
    this.triangleDetector = new TriangleDetector(GestureConfig.triangle);
    this.pointDetector = new PointDetector(GestureConfig.point);
    this.palmGrabDetector = new PalmGrabDetector(GestureConfig.palm);

    this.pinchStates = { left: 'idle', right: 'idle' };
  }

  init() {
    eventBus.on('hand:update', (data) => this.onHandUpdate(data));
  }

  onHandUpdate({ hands }) {
    if (!hands || hands.length === 0) return;

    const allEvents = [];

    const handMap = {};
    for (const hand of hands) {
      const key = hand.handedness.toLowerCase();
      handMap[key] = hand;
    }

    // --- Phase 1: Pinch detection ---
    for (const hand of hands) {
      const handKey = hand.handedness.toLowerCase();
      const pinchEvents = this.pinchDetector.detect(hand);
      allEvents.push(...pinchEvents);
      this.pinchStates[handKey] = this.pinchDetector.getPhase(handKey);
    }

    // --- Phase 2: Dependent detectors ---
    const leftPinchHold = this.pinchStates.left === 'hold';
    const rightPinchHold = this.pinchStates.right === 'hold';

    // Two-hand scale
    if (leftPinchHold && rightPinchHold && handMap.left && handMap.right) {
      const scaleEvents = this.scaleDetector.detect(handMap.left, handMap.right, true, true);
      allEvents.push(...scaleEvents);
    } else {
      this.scaleDetector.detect(
        handMap.left || null, handMap.right || null,
        leftPinchHold, rightPinchHold
      );
    }

    // Triangle: both hands, not pinching
    if (!leftPinchHold && !rightPinchHold && handMap.left && handMap.right) {
      const triEvents = this.triangleDetector.detect(handMap.left, handMap.right);
      allEvents.push(...triEvents);
    }

    // Per-hand detectors
    for (const hand of hands) {
      const handKey = hand.handedness.toLowerCase();
      const isPinchHold = this.pinchStates[handKey] === 'hold';

      const rotateEvents = this.rotateDetector.detect(hand, isPinchHold);
      allEvents.push(...rotateEvents);

      if (isPinchHold) {
        const swipeEvents = this.swipeDetector.detect(hand);
        allEvents.push(...swipeEvents);
      } else {
        // Fist grab detection (when not pinching)
        const fistEvents = this.palmGrabDetector.detect(hand);
        allEvents.push(...fistEvents);

        // Point detection
        const pointEvents = this.pointDetector.detect(hand);
        allEvents.push(...pointEvents);
      }
    }

    // --- Phase 3: Emit ---
    for (const { event, data } of allEvents) {
      eventBus.emit(event, data);
    }
  }
}
