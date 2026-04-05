import * as THREE from 'three';
import { createHologramMaterial } from '../HologramMaterial.js';
import { createOutline } from '../HologramOutline.js';
import { createParticles, updateParticles } from '../HologramParticles.js';
import {
  addInnerShell, addInnerShell2, addOrbitRing, addOrbitRing2,
  addCrossSections, addVertexNodes, addMeasurementLines,
  addGroundRing, addAxisLines, addInnerWireframe,
  applyIdleRotation, updateEnhancements
} from '../HoloEnhancements.js';

export default class HoloPlane {
  constructor(position = { x: 0, y: 0, z: 0 }) {
    this.type = 'plane';
    this.id = crypto.randomUUID();
    this.group = new THREE.Group();
    this._selected = false;

    const geometry = new THREE.PlaneGeometry(1.2, 1.2, 8, 8);

    this.mesh = new THREE.Mesh(geometry, createHologramMaterial());
    this.material = this.mesh.material;

    // Wireframe outline (primary visual)
    this.mesh.add(createOutline(geometry));

    // Nested inner shells (visible internal structure)
    this._enhancements = {};
    this._enhancements.innerShell = addInnerShell(this.mesh, geometry, 0.6);
    this._enhancements.innerShell2 = addInnerShell2(this.mesh, geometry, 0.3);

    // Vertex highlight nodes
    addVertexNodes(this.mesh, geometry);

    this.group.add(this.mesh);

    // Particles
    this.particles = createParticles(0.85);
    this.group.add(this.particles);

    // Structural enhancements (on group — stay level)
    this._enhancements.orbitRing = addOrbitRing(this.group, 0.85);
    this._enhancements.orbitRing2 = addOrbitRing2(this.group, 0.85);
    addCrossSections(this.group, 0.85);
    addMeasurementLines(this.group, 0.85);
    addGroundRing(this.group, 0.85);
    addAxisLines(this.group, 0.85);

    this.group.position.set(position.x, position.y, position.z);
    this.geometry = geometry;
  }

  update(time) {
    this.material.uniforms.uTime.value = time;
    updateParticles(this.particles, time);
    applyIdleRotation(this.mesh, time, this._selected);
    updateEnhancements(this._enhancements, time);
  }

  setSelected(selected) {
    this._selected = selected;
    this.material.uniforms.uSelected.value = selected ? 1.0 : 0.0;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
