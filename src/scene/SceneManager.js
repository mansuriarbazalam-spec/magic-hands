import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, CAMERA_Z, HOLOGRAM_COLOR } from '../utils/Constants.js';

export default class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.onUpdateCallbacks = [];
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
    this.camera.position.set(0, 0, CAMERA_Z);

    // Renderer — transparent background so camera feed shows through
    const canvas = document.getElementById('three-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);

    const pointLight = new THREE.PointLight(HOLOGRAM_COLOR, 1, 50);
    pointLight.position.set(0, 2, 5);
    this.scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x0066ff, 0.5, 50);
    pointLight2.position.set(-3, -1, 3);
    this.scene.add(pointLight2);

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Start render loop
    this.animate();
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  onUpdate(callback) {
    this.onUpdateCallbacks.push(callback);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const elapsed = this.clock.getElapsedTime();

    for (const cb of this.onUpdateCallbacks) {
      cb(elapsed);
    }

    this.renderer.render(this.scene, this.camera);
  }

  getScene() { return this.scene; }
  getCamera() { return this.camera; }
}
