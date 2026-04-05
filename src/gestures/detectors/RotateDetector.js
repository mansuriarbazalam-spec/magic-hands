import { angle2D } from '../../utils/MathUtils.js';

export default class RotateDetector {
  constructor(config) {
    this.config = config;
    this.previousAngle = { left: null, right: null };
  }

  detect(hand, isPinchHold) {
    const events = [];
    const handKey = hand.handedness.toLowerCase();

    if (!isPinchHold) {
      // Reset tracking when not pinching
      this.previousAngle[handKey] = null;
      return events;
    }

    const wrist = hand.landmarks[0];
    const middleMCP = hand.landmarks[9];
    const currentAngle = angle2D(wrist, middleMCP);

    if (this.previousAngle[handKey] !== null) {
      let delta = currentAngle - this.previousAngle[handKey];

      // Handle wrap-around at -PI/PI boundary
      if (delta > Math.PI) {
        delta -= 2 * Math.PI;
      } else if (delta < -Math.PI) {
        delta += 2 * Math.PI;
      }

      // Negate delta: video is mirrored so raw angle direction is inverted
      delta = -delta;

      if (Math.abs(delta) > this.config.minDelta) {
        events.push({
          event: 'gesture:rotate',
          data: { hand: handKey, angle: currentAngle, delta }
        });
      }
    }

    this.previousAngle[handKey] = currentAngle;
    return events;
  }
}
