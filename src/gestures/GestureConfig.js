export default {
  pinch: {
    threshold: 0.06,
    holdFrames: 3,
    releaseThreshold: 0.08
  },
  rotate: {
    minDelta: 0.02
  },
  scale: {
    minFactor: 0.1,
    maxFactor: 5.0,
    sensitivity: 1.0
  },
  swipe: {
    velocityThreshold: 0.12,
    minFrames: 3,
    cooldownFrames: 15
  },
  triangle: {
    touchThreshold: 0.09,     // max distance between matching fingertips
    holdFrames: 8,            // frames held to trigger
    cooldownFrames: 40        // prevent rapid re-triggers
  },
  point: {
    extensionRatio: 1.05,
    curlRatio: 1.15
  },
  palm: {
    fistEnterThreshold: 1.05,  // to ENTER fist: tips within 105% of PIP distance (lenient entry)
    fistKeepThreshold: 1.25,   // to STAY in fist: much more lenient — prevents dropout
    minCurled: 2,              // only need 2 of 4 fingers curled
    releaseDebounce: 8         // must be open for 8 frames to actually release (~130ms)
  }
};
