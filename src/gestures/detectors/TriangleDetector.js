import { distance3D } from '../../utils/MathUtils.js';

/**
 * TriangleDetector — Both hands form a triangle (thumbs + index fingers touching).
 *
 * Detects when:
 *  - Left thumb tip (4) is near Right thumb tip (4)
 *  - Left index tip (8) is near Right index tip (8)
 *  - Held for a few frames to avoid false triggers
 */
export default class TriangleDetector {
  constructor(config) {
    this.config = config;
    this.framesHeld = 0;
    this.cooldown = 0;
    this.wasActive = false;
  }

  detect(leftHand, rightHand) {
    const events = [];

    if (this.cooldown > 0) {
      this.cooldown--;
      return events;
    }

    if (!leftHand || !rightHand) {
      this.framesHeld = 0;
      this.wasActive = false;
      return events;
    }

    const leftThumb = leftHand.landmarks[4];
    const rightThumb = rightHand.landmarks[4];
    const leftIndex = leftHand.landmarks[8];
    const rightIndex = rightHand.landmarks[8];

    const thumbDist = distance3D(leftThumb, rightThumb);
    const indexDist = distance3D(leftIndex, rightIndex);

    const isTriangle = thumbDist < this.config.touchThreshold &&
                       indexDist < this.config.touchThreshold;

    if (isTriangle) {
      this.framesHeld++;

      if (this.framesHeld >= this.config.holdFrames && !this.wasActive) {
        this.wasActive = true;
        events.push({
          event: 'gesture:triangle',
          data: { state: 'detected' }
        });
        this.cooldown = this.config.cooldownFrames;
        this.framesHeld = 0;
      }
    } else {
      this.framesHeld = 0;
      this.wasActive = false;
    }

    return events;
  }
}
