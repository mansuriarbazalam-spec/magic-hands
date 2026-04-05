import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import eventBus from '../core/EventBus.js';
import { createFilterBank } from './SmoothingFilter.js';

class HandTracker {
  constructor() {
    this.handLandmarker = null;
    this.video = null;
    this.filters = createFilterBank(2, 21, 3);
    this.running = false;
    this.previousHands = new Set(); // track which hands were visible last frame

    // Auto-initialize when camera is ready
    eventBus.on('camera:ready', ({ video }) => {
      this.init(video);
    });
  }

  async init(videoElement) {
    try {
      this.video = videoElement;

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.running = true;
      this._detect();
      console.log('HandTracker initialized');
    } catch (error) {
      console.error('HandTracker initialization failed:', error);
      eventBus.emit('tracking:error', { error });
    }
  }

  _detect() {
    if (!this.running || !this.video || !this.handLandmarker) return;

    const now = performance.now();
    const results = this.handLandmarker.detectForVideo(this.video, now);

    const currentHands = new Set();
    const hands = [];

    if (results.landmarks && results.landmarks.length > 0) {
      for (let h = 0; h < results.landmarks.length; h++) {
        const rawLandmarks = results.landmarks[h];
        const handedness =
          results.handednesses[h]?.[0]?.categoryName || 'Unknown';

        currentHands.add(handedness);

        // Apply smoothing filter to each landmark coordinate
        const filterIndex = handedness === 'Right' ? 0 : 1;
        const smoothedLandmarks = rawLandmarks.map((lm, lIdx) => {
          return {
            x: this.filters[filterIndex][lIdx][0].filter(lm.x, now),
            y: this.filters[filterIndex][lIdx][1].filter(lm.y, now),
            z: this.filters[filterIndex][lIdx][2].filter(lm.z, now)
          };
        });

        hands.push({
          landmarks: smoothedLandmarks,
          handedness: handedness
        });
      }
    }

    // Emit update with all currently detected hands
    if (hands.length > 0) {
      eventBus.emit('hand:update', { hands });
    }

    // Check for lost hands
    for (const prevHand of this.previousHands) {
      if (!currentHands.has(prevHand)) {
        // Reset filters for lost hand
        const filterIndex = prevHand === 'Right' ? 0 : 1;
        for (let l = 0; l < 21; l++) {
          for (let a = 0; a < 3; a++) {
            this.filters[filterIndex][l][a].reset();
          }
        }
        eventBus.emit('hand:lost', { handedness: prevHand });
      }
    }

    this.previousHands = currentHands;

    requestAnimationFrame(() => this._detect());
  }

  stop() {
    this.running = false;
  }
}

export default new HandTracker();
