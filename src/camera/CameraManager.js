import eventBus from '../core/EventBus.js';

class CameraManager {
  constructor() {
    this.video = null;
    this.stream = null;
  }

  async init() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.video = document.createElement('video');
      this.video.setAttribute('autoplay', '');
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('muted', '');
      this.video.muted = true;
      this.video.srcObject = this.stream;

      // Wait for video data to be ready
      await new Promise((resolve) => {
        this.video.addEventListener('loadeddata', resolve, { once: true });
        this.video.play();
      });

      // Mirror mode is handled by CSS (transform: scaleX(-1) in main.css)
      // Append to the camera container
      const container = document.getElementById('camera-container');
      container.appendChild(this.video);

      eventBus.emit('camera:ready', { video: this.video });
      console.log(`Camera ready: ${this.video.videoWidth}x${this.video.videoHeight}`);
    } catch (error) {
      console.error('Camera initialization failed:', error.message);
      eventBus.emit('camera:error', { error });
    }
  }

  getVideo() {
    return this.video;
  }
}

export default new CameraManager();
