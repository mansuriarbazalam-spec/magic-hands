import { distance2D, normalize2D } from '../../utils/MathUtils.js';

export default class SwipeDetector {
  constructor(config) {
    this.config = config;
    this.buffers = { left: [], right: [] };
    this.fastFrames = { left: 0, right: 0 };
    this.cooldowns = { left: 0, right: 0 };
  }

  detect(hand) {
    const events = [];
    const handKey = hand.handedness.toLowerCase();

    // Handle cooldown
    if (this.cooldowns[handKey] > 0) {
      this.cooldowns[handKey]--;
      this.buffers[handKey] = [];
      this.fastFrames[handKey] = 0;
      return events;
    }

    // Compute palm center as average of wrist + 4 finger MCP bases
    const palmLandmarks = [0, 5, 9, 13, 17];
    const palmCenter = { x: 0, y: 0 };
    for (const idx of palmLandmarks) {
      palmCenter.x += hand.landmarks[idx].x;
      palmCenter.y += hand.landmarks[idx].y;
    }
    palmCenter.x /= palmLandmarks.length;
    palmCenter.y /= palmLandmarks.length;

    // Maintain a rolling buffer of the last 5 frames
    const buffer = this.buffers[handKey];
    buffer.push({ x: palmCenter.x, y: palmCenter.y });
    if (buffer.length > 5) {
      buffer.shift();
    }

    if (buffer.length < 2) return events;

    // Compute velocity between current and oldest buffered position
    const oldest = buffer[0];
    const current = buffer[buffer.length - 1];
    const frameSpan = buffer.length - 1;
    const velocity = distance2D(current, oldest) / frameSpan;

    if (velocity > this.config.velocityThreshold) {
      this.fastFrames[handKey]++;
    } else {
      this.fastFrames[handKey] = 0;
    }

    if (this.fastFrames[handKey] >= this.config.minFrames) {
      const direction = normalize2D({
        x: -(current.x - oldest.x),  // negate X: video is mirrored
        y: current.y - oldest.y
      });

      events.push({
        event: 'gesture:swipe',
        data: { hand: handKey, direction, velocity }
      });

      // Enter cooldown and reset
      this.cooldowns[handKey] = this.config.cooldownFrames;
      this.fastFrames[handKey] = 0;
      this.buffers[handKey] = [];
    }

    return events;
  }
}
