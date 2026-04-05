import * as THREE from 'three';

/**
 * Creates the primary wireframe visual — this IS the hologram.
 * Multi-layered: bright core wireframe + outer glow wireframe + edge highlights.
 */
export function createOutline(geometry) {
  const group = new THREE.Group();

  // Layer 1: Full wireframe — the dense structural mesh
  const wire = new THREE.WireframeGeometry(geometry);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0x00bbff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  group.add(new THREE.LineSegments(wire, wireMat));

  // Layer 2: Bright edge highlights
  const edges = new THREE.EdgesGeometry(geometry, 10);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x88eeff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const edgeLines = new THREE.LineSegments(edges, edgeMat);
  edgeLines.scale.multiplyScalar(1.002);
  group.add(edgeLines);

  // Layer 3: Outer glow wireframe (slightly larger)
  const wire2 = new THREE.WireframeGeometry(geometry);
  const glowMat = new THREE.LineBasicMaterial({
    color: 0x0066cc,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glowWire = new THREE.LineSegments(wire2, glowMat);
  glowWire.scale.multiplyScalar(1.015);
  group.add(glowWire);

  return group;
}
