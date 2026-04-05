import { distance3D } from '../../utils/MathUtils.js';
import coordinateMapper from '../../core/CoordinateMapper.js';

/**
 * FistGrabDetector — Reliable fist detection with hysteresis and debounce.
 *
 * Problems solved:
 * - Hysteresis: strict threshold to ENTER fist, lenient to STAY in fist
 * - Debounce: requires N frames of "open" before actually releasing
 * - Rotation smoothing: EMA on deltas to prevent jumps
 */
export default class PalmGrabDetector {
  constructor(config) {
    this.config = config;
    this.state = { left: 'open', right: 'open' };
    this.prevPalmCenter = { left: null, right: null };
    this.openFrameCount = { left: 0, right: 0 }; // debounce counter
    this.smoothRotX = { left: 0, right: 0 };
    this.smoothRotY = { left: 0, right: 0 };
  }

  detect(hand) {
    const events = [];
    const handKey = hand.handedness.toLowerCase();
    const lm = hand.landmarks;
    const wrist = lm[0];

    // Count curled fingers (excluding thumb — unreliable in a fist)
    const fingers = [
      { tip: 8, pip: 6 },
      { tip: 12, pip: 10 },
      { tip: 16, pip: 14 },
      { tip: 20, pip: 18 }
    ];

    // Use DIFFERENT thresholds based on current state (hysteresis)
    const inFist = this.state[handKey] === 'fist';
    const threshold = inFist
      ? this.config.fistKeepThreshold   // lenient — stay in fist
      : this.config.fistEnterThreshold; // stricter — enter fist

    let curledCount = 0;
    for (const { tip, pip } of fingers) {
      const tipDist = distance3D(lm[tip], wrist);
      const pipDist = distance3D(lm[pip], wrist);
      if (tipDist < pipDist * threshold) {
        curledCount++;
      }
    }

    const isFist = curledCount >= this.config.minCurled;
    const prevState = this.state[handKey];

    // Palm center
    const palmIndices = [0, 5, 9, 13, 17];
    const palmCenter = { x: 0, y: 0, z: 0 };
    for (const i of palmIndices) {
      palmCenter.x += lm[i].x;
      palmCenter.y += lm[i].y;
      palmCenter.z += lm[i].z;
    }
    palmCenter.x /= palmIndices.length;
    palmCenter.y /= palmIndices.length;
    palmCenter.z /= palmIndices.length;

    const worldPosition = coordinateMapper.toThreeJS(palmCenter);

    // Compute smoothed rotation deltas from hand movement
    let rotationX = 0;
    let rotationY = 0;

    if ((isFist || inFist) && this.prevPalmCenter[handKey]) {
      const prev = this.prevPalmCenter[handKey];
      const rawDx = -(palmCenter.x - prev.x);
      const rawDy = palmCenter.y - prev.y;

      // Scale to rotation
      const rawRotY = rawDx * 8.0;
      const rawRotX = rawDy * 8.0;

      // Clamp to prevent jumps from tracking glitches
      const maxDelta = 0.15;
      const clampedRotY = Math.max(-maxDelta, Math.min(maxDelta, rawRotY));
      const clampedRotX = Math.max(-maxDelta, Math.min(maxDelta, rawRotX));

      // EMA smoothing (0.4 = responsive but smooth)
      this.smoothRotY[handKey] = this.smoothRotY[handKey] * 0.3 + clampedRotY * 0.7;
      this.smoothRotX[handKey] = this.smoothRotX[handKey] * 0.3 + clampedRotX * 0.7;

      rotationY = this.smoothRotY[handKey];
      rotationX = this.smoothRotX[handKey];

      // Dead zone
      if (Math.abs(rotationY) < 0.002) rotationY = 0;
      if (Math.abs(rotationX) < 0.002) rotationX = 0;
    }
    this.prevPalmCenter[handKey] = { ...palmCenter };

    // --- State machine with debounce ---
    if (isFist && prevState === 'open') {
      // Enter fist
      this.state[handKey] = 'fist';
      this.openFrameCount[handKey] = 0;
      this.smoothRotX[handKey] = 0;
      this.smoothRotY[handKey] = 0;
      events.push({
        event: 'gesture:fist',
        data: { hand: handKey, state: 'grab', worldPosition, rotationX: 0, rotationY: 0 }
      });
    } else if (prevState === 'fist') {
      if (!isFist) {
        // Hand opened — but DEBOUNCE: only release after N frames
        this.openFrameCount[handKey]++;
        if (this.openFrameCount[handKey] >= this.config.releaseDebounce) {
          // Actually release
          this.state[handKey] = 'open';
          this.prevPalmCenter[handKey] = null;
          this.smoothRotX[handKey] = 0;
          this.smoothRotY[handKey] = 0;
          events.push({
            event: 'gesture:fist',
            data: { hand: handKey, state: 'release', worldPosition, rotationX: 0, rotationY: 0 }
          });
        } else {
          // Still in fist (debouncing) — emit hold to keep it alive
          events.push({
            event: 'gesture:fist',
            data: { hand: handKey, state: 'hold', worldPosition, rotationX, rotationY }
          });
        }
      } else {
        // Still in fist — normal hold
        this.openFrameCount[handKey] = 0;
        events.push({
          event: 'gesture:fist',
          data: { hand: handKey, state: 'hold', worldPosition, rotationX, rotationY }
        });
      }
    }

    return events;
  }
}
