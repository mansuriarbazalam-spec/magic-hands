import { distance3D, midpoint } from '../../utils/MathUtils.js';

export default class PinchDetector {
  constructor(config) {
    this.config = config;
    this.state = {
      left: { phase: 'idle', framesBelow: 0 },
      right: { phase: 'idle', framesBelow: 0 }
    };
  }

  detect(hand) {
    const events = [];
    const handKey = hand.handedness.toLowerCase();
    const state = this.state[handKey];
    if (!state) return events;

    const thumbTip = hand.landmarks[4];
    const indexTip = hand.landmarks[8];
    const dist = distance3D(thumbTip, indexTip);
    const position = midpoint(thumbTip, indexTip);

    switch (state.phase) {
      case 'idle':
        if (dist < this.config.threshold) {
          state.framesBelow++;
          if (state.framesBelow >= this.config.holdFrames) {
            state.phase = 'hold';
            events.push({
              event: 'gesture:pinch',
              data: { hand: handKey, position, state: 'start' }
            });
          }
        } else {
          state.framesBelow = 0;
        }
        break;

      case 'hold':
        if (dist > this.config.releaseThreshold) {
          state.phase = 'idle';
          state.framesBelow = 0;
          events.push({
            event: 'gesture:pinch',
            data: { hand: handKey, position, state: 'end' }
          });
        } else {
          events.push({
            event: 'gesture:pinch',
            data: { hand: handKey, position, state: 'hold' }
          });
        }
        break;
    }

    return events;
  }

  getPhase(handKey) {
    return this.state[handKey] ? this.state[handKey].phase : 'idle';
  }
}
