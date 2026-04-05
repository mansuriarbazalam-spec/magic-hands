import { distance3D } from '../../utils/MathUtils.js';
import coordinateMapper from '../../core/CoordinateMapper.js';

export default class PointDetector {
  constructor(config) {
    this.config = config;
  }

  detect(hand) {
    const events = [];
    const handKey = hand.handedness.toLowerCase();
    const lm = hand.landmarks;
    const wrist = lm[0];

    // Index extended: tip (8) must be significantly farther from wrist than PIP (6)
    const indexTipDist = distance3D(lm[8], wrist);
    const indexPIPDist = distance3D(lm[6], wrist);
    const indexExtended = indexTipDist > indexPIPDist * this.config.extensionRatio;

    // Middle curled: tip (12) closer to wrist than PIP (10)
    const middleTipDist = distance3D(lm[12], wrist);
    const middlePIPDist = distance3D(lm[10], wrist);
    const middleCurled = middleTipDist < middlePIPDist * this.config.curlRatio;

    // Ring curled: tip (16) closer to wrist than PIP (14)
    const ringTipDist = distance3D(lm[16], wrist);
    const ringPIPDist = distance3D(lm[14], wrist);
    const ringCurled = ringTipDist < ringPIPDist * this.config.curlRatio;

    // Pinky curled: tip (20) closer to wrist than PIP (18)
    const pinkyTipDist = distance3D(lm[20], wrist);
    const pinkyPIPDist = distance3D(lm[18], wrist);
    const pinkyCurled = pinkyTipDist < pinkyPIPDist * this.config.curlRatio;

    if (indexExtended && middleCurled && ringCurled && pinkyCurled) {
      const indexTip = lm[8];
      const screenPosition = coordinateMapper.toScreen(
        indexTip,
        window.innerWidth,
        window.innerHeight
      );
      const worldPosition = coordinateMapper.toThreeJS(indexTip);

      events.push({
        event: 'gesture:point',
        data: { hand: handKey, screenPosition, worldPosition }
      });
    }

    return events;
  }
}
