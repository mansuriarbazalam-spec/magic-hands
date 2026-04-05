export class OneEuroFilter {
  constructor(minCutoff = 10.0, beta = 0.2, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  filter(x, timestamp) {
    if (this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = timestamp;
      return x;
    }

    const dt = Math.max((timestamp - this.tPrev) / 1000, 1 / 120);
    this.tPrev = timestamp;

    const dx = (x - this.xPrev) / dt;
    const alphaDx = this._alpha(this.dCutoff, dt);
    const dxSmoothed = alphaDx * dx + (1 - alphaDx) * this.dxPrev;
    this.dxPrev = dxSmoothed;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxSmoothed);
    const alpha = this._alpha(cutoff, dt);

    const xSmoothed = alpha * x + (1 - alpha) * this.xPrev;
    this.xPrev = xSmoothed;

    return xSmoothed;
  }

  _alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

/**
 * Create a 3D array of OneEuroFilter instances: [hand][landmark][axis]
 */
export function createFilterBank(numHands = 2, numLandmarks = 21, numAxes = 3) {
  const bank = [];
  for (let h = 0; h < numHands; h++) {
    const hand = [];
    for (let l = 0; l < numLandmarks; l++) {
      const axes = [];
      for (let a = 0; a < numAxes; a++) {
        axes.push(new OneEuroFilter());
      }
      hand.push(axes);
    }
    bank.push(hand);
  }
  return bank;
}
