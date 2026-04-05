import * as THREE from 'three';
import hologramVert from '../../shaders/hologram.vert?raw';
import hologramFrag from '../../shaders/hologram.frag?raw';
import { HOLOGRAM_COLOR, HOLOGRAM_OPACITY } from '../utils/Constants.js';

export function createHologramMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: hologramVert,
    fragmentShader: hologramFrag,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(HOLOGRAM_COLOR) },
      uOpacity: { value: HOLOGRAM_OPACITY },
      uSelected: { value: 0.0 }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}
