import { VIEW_WIDTH, VIEW_HEIGHT, DEPTH_SCALE } from '../utils/Constants.js';

class CoordinateMapper {
  /**
   * Transform MediaPipe normalized landmark to Three.js world space.
   *
   * MediaPipe: x(0-1 left->right), y(0-1 top->bottom), z(negative=closer)
   * Three.js:  x(left->right centered), y(bottom->top centered), z(positive=toward camera)
   */
  toThreeJS(landmark) {
    // Mirror X: video is CSS-flipped for selfie mode, but MediaPipe gives raw coords
    const mirroredX = 1 - landmark.x;
    return {
      x: (mirroredX - 0.5) * VIEW_WIDTH,
      y: -(landmark.y - 0.5) * VIEW_HEIGHT,
      z: -landmark.z * DEPTH_SCALE
    };
  }

  /**
   * Transform MediaPipe normalized landmark to screen pixel coordinates.
   */
  toScreen(landmark, canvasWidth, canvasHeight) {
    // Mirror X to match the CSS-flipped video
    return {
      x: (1 - landmark.x) * canvasWidth,
      y: landmark.y * canvasHeight
    };
  }
}

export default new CoordinateMapper();
