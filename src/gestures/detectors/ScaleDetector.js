import { distance3D, midpoint } from '../../utils/MathUtils.js';
import { clamp } from '../../utils/MathUtils.js';

export default class ScaleDetector {
  constructor(config) {
    this.config = config;
    this.initialDistance = null;
    this.previousFactor = null;
    this.active = false;
  }

  detect(leftHand, rightHand, leftPinchHold, rightPinchHold) {
    const events = [];

    if (!leftHand || !rightHand || !leftPinchHold || !rightPinchHold) {
      // Reset when either hand stops pinching
      if (this.active) {
        this.active = false;
        this.initialDistance = null;
        this.previousFactor = null;
      }
      return events;
    }

    // Compute pinch midpoints for each hand
    const leftMidpoint = midpoint(leftHand.landmarks[4], leftHand.landmarks[8]);
    const rightMidpoint = midpoint(rightHand.landmarks[4], rightHand.landmarks[8]);
    const currentDistance = distance3D(leftMidpoint, rightMidpoint);

    if (!this.active) {
      // Both hands just started pinching together
      this.initialDistance = currentDistance;
      this.previousFactor = 1.0;
      this.active = true;
      return events;
    }

    if (this.initialDistance === 0) return events;

    const rawFactor = (currentDistance / this.initialDistance) * this.config.sensitivity;
    const factor = clamp(rawFactor, this.config.minFactor, this.config.maxFactor);
    const delta = factor - this.previousFactor;
    this.previousFactor = factor;

    events.push({
      event: 'gesture:scale',
      data: { hands: 'both', factor, delta }
    });

    return events;
  }
}
