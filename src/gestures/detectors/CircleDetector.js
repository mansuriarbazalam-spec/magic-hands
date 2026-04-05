import { distance2D } from '../../utils/MathUtils.js';

export default class CircleDetector {
  constructor(config) {
    this.config = config;
    this.tracking = {
      left: this._freshState(),
      right: this._freshState()
    };
  }

  _freshState() {
    return {
      positions: [],
      accumulatedAngle: 0,
      previousAngle: null,
      frameCount: 0,
      cooldown: 0
    };
  }

  detect(hand) {
    const events = [];
    const handKey = hand.handedness.toLowerCase();
    const state = this.tracking[handKey];

    // Handle cooldown
    if (state.cooldown > 0) {
      state.cooldown--;
      return events;
    }

    const indexTip = hand.landmarks[8];
    const currentPos = { x: indexTip.x, y: indexTip.y };

    // Check if the finger has moved enough to count
    if (state.positions.length > 0) {
      const lastPos = state.positions[state.positions.length - 1];
      if (distance2D(currentPos, lastPos) < this.config.minRadius) {
        // Barely moved, increment frame count but don't accumulate angle
        state.frameCount++;
        if (state.frameCount > this.config.maxFrames) {
          this._reset(handKey);
        }
        return events;
      }
    }

    // Add position to ring buffer
    state.positions.push(currentPos);
    state.frameCount++;

    // Need at least 3 positions to compute a meaningful centroid and angle
    if (state.positions.length < 3) {
      return events;
    }

    // Keep only the last maxFrames positions
    if (state.positions.length > this.config.maxFrames) {
      state.positions.shift();
    }

    // Compute centroid of all stored positions
    const centroid = { x: 0, y: 0 };
    for (const pos of state.positions) {
      centroid.x += pos.x;
      centroid.y += pos.y;
    }
    centroid.x /= state.positions.length;
    centroid.y /= state.positions.length;

    // Compute angle from centroid to current position
    const currentAngle = Math.atan2(
      currentPos.y - centroid.y,
      currentPos.x - centroid.x
    );

    if (state.previousAngle !== null) {
      let delta = currentAngle - state.previousAngle;

      // Handle wrap-around at -PI/PI boundary
      if (delta > Math.PI) {
        delta -= 2 * Math.PI;
      } else if (delta < -Math.PI) {
        delta += 2 * Math.PI;
      }

      state.accumulatedAngle += delta;
    }

    state.previousAngle = currentAngle;

    // Check if we completed a near-full circle
    if (Math.abs(state.accumulatedAngle) >= this.config.minAngle) {
      events.push({
        event: 'gesture:circle',
        data: { hand: handKey, state: 'detected' }
      });

      // Reset and enter cooldown
      this._reset(handKey);
      this.tracking[handKey].cooldown = this.config.cooldownFrames;
    }

    // Timeout: reset if too many frames without completing
    if (state.frameCount > this.config.maxFrames) {
      this._reset(handKey);
    }

    return events;
  }

  _reset(handKey) {
    const cooldown = this.tracking[handKey].cooldown;
    this.tracking[handKey] = this._freshState();
    this.tracking[handKey].cooldown = cooldown;
  }
}
