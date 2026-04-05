import * as THREE from 'three';
import { HOLOGRAM_COLOR } from '../utils/Constants.js';

/**
 * Creates a nested inner shell — a smaller version of the geometry inside.
 * Gives the "look inside" structural depth.
 */
export function addInnerShell(parentMesh, geometry, scale = 0.6) {
  const wire = new THREE.WireframeGeometry(geometry);
  const mat = new THREE.LineBasicMaterial({
    color: 0x0088cc,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const shell = new THREE.LineSegments(wire, mat);
  shell.scale.setScalar(scale);
  parentMesh.add(shell);
  return shell;
}

/**
 * Creates a second even smaller inner shell.
 */
export function addInnerShell2(parentMesh, geometry, scale = 0.3) {
  const wire = new THREE.WireframeGeometry(geometry);
  const mat = new THREE.LineBasicMaterial({
    color: 0x004488,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const shell = new THREE.LineSegments(wire, mat);
  shell.scale.setScalar(scale);
  parentMesh.add(shell);
  return shell;
}

/**
 * Orbiting data ring with tick marks.
 */
export function addOrbitRing(group, radius) {
  const ringGroup = new THREE.Group();

  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: HOLOGRAM_COLOR, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
  });
  ringGroup.add(new THREE.Line(geo, mat));

  // Tick marks
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const major = i % 6 === 0;
    const inner = radius * (major ? 0.88 : 0.93);
    const outer = radius * (major ? 1.15 : 1.07);
    const tGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * inner, 0, Math.sin(a) * inner),
      new THREE.Vector3(Math.cos(a) * outer, 0, Math.sin(a) * outer)
    ]);
    const tMat = new THREE.LineBasicMaterial({
      color: major ? 0xffffff : HOLOGRAM_COLOR,
      transparent: true, opacity: major ? 0.6 : 0.25, blending: THREE.AdditiveBlending
    });
    ringGroup.add(new THREE.Line(tGeo, tMat));
  }

  // Data arc segments (partial arcs at different radii)
  for (let i = 0; i < 3; i++) {
    const r = radius * (1.2 + i * 0.12);
    const startA = Math.random() * Math.PI * 2;
    const arcLen = 0.5 + Math.random() * 1.0;
    const arcPts = [];
    for (let j = 0; j <= 20; j++) {
      const a = startA + (j / 20) * arcLen;
      arcPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const aGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
    const aMat = new THREE.LineBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending
    });
    ringGroup.add(new THREE.Line(aGeo, aMat));
  }

  ringGroup.rotation.x = 0.15;
  group.add(ringGroup);
  return ringGroup;
}

/**
 * Second orbit ring — perpendicular axis.
 */
export function addOrbitRing2(group, radius) {
  const ringGroup = new THREE.Group();
  const r = radius * 0.9;
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0x0077cc, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending
  });
  ringGroup.add(new THREE.Line(geo, mat));

  // Third ring at another angle
  const pts3 = [];
  const r3 = radius * 1.05;
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    pts3.push(new THREE.Vector3(Math.cos(a) * r3, Math.sin(a) * r3 * 0.5, Math.cos(a + 1) * r3 * 0.5));
  }
  const geo3 = new THREE.BufferGeometry().setFromPoints(pts3);
  const mat3 = new THREE.LineBasicMaterial({
    color: 0x0066aa, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending
  });
  ringGroup.add(new THREE.Line(geo3, mat3));

  group.add(ringGroup);
  return ringGroup;
}

/**
 * Cross-section scan rings at multiple heights.
 */
export function addCrossSections(group, radius, count = 7) {
  const sections = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const y = ((i / (count - 1)) - 0.5) * radius * 1.6;
    const r = radius * (0.5 + 0.5 * Math.cos((y / radius) * 1.2));
    const pts = [];
    for (let j = 0; j <= 40; j++) {
      const a = (j / 40) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: HOLOGRAM_COLOR, transparent: true, opacity: 0.12,
      dashSize: 0.06, gapSize: 0.05, blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    sections.add(line);
  }
  group.add(sections);
  return sections;
}

/**
 * Bright glowing vertex nodes at geometry vertices.
 */
export function addVertexNodes(parentMesh, geometry, maxNodes = 40) {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr) return null;

  const seen = new Set();
  const verts = [];
  for (let i = 0; i < posAttr.count && verts.length < maxNodes; i++) {
    const key = `${posAttr.getX(i).toFixed(2)},${posAttr.getY(i).toFixed(2)},${posAttr.getZ(i).toFixed(2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      verts.push(new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)));
    }
  }

  const positions = new Float32Array(verts.length * 3);
  verts.forEach((v, i) => {
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Main bright nodes
  const mat = new THREE.PointsMaterial({
    color: 0xaaffff, size: 0.07, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const points = new THREE.Points(geo, mat);
  parentMesh.add(points);

  // Glow halo nodes (larger, dimmer)
  const geo2 = new THREE.BufferGeometry();
  geo2.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
  const mat2 = new THREE.PointsMaterial({
    color: 0x44aaff, size: 0.14, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  parentMesh.add(new THREE.Points(geo2, mat2));

  return points;
}

/**
 * Measurement/dimension lines.
 */
export function addMeasurementLines(group, radius) {
  const lines = new THREE.Group();
  const r = radius;

  const makeLine = (from, to, opacity) => {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineDashedMaterial({
      color: 0x3399cc, transparent: true, opacity,
      dashSize: 0.04, gapSize: 0.03, blending: THREE.AdditiveBlending
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  };

  // Height
  lines.add(makeLine(
    new THREE.Vector3(r * 1.3, -r * 0.6, 0),
    new THREE.Vector3(r * 1.3, r * 0.6, 0), 0.2
  ));
  // Width
  lines.add(makeLine(
    new THREE.Vector3(-r * 0.6, -r * 0.75, 0),
    new THREE.Vector3(r * 0.6, -r * 0.75, 0), 0.15
  ));
  // Depth
  lines.add(makeLine(
    new THREE.Vector3(-r * 1.2, 0, -r * 0.5),
    new THREE.Vector3(-r * 1.2, 0, r * 0.5), 0.12
  ));

  group.add(lines);
  return lines;
}

/**
 * Ground projection rings.
 */
export function addGroundRing(group, radius) {
  const ground = new THREE.Group();
  const y = -radius * 0.65;

  for (let i = 1; i <= 3; i++) {
    const r = radius * (0.35 * i);
    const pts = [];
    for (let j = 0; j <= 48; j++) {
      const a = (j / 48) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: HOLOGRAM_COLOR, transparent: true, opacity: 0.06 + (3 - i) * 0.03,
      blending: THREE.AdditiveBlending
    });
    ground.add(new THREE.Line(geo, mat));
  }

  group.add(ground);
  return ground;
}

export function addAxisLines(group, size) {
  const s = size * 0.6;
  const axes = new THREE.Group();
  const make = (from, to, color, op) => {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineDashedMaterial({
      color, transparent: true, opacity: op,
      dashSize: 0.05, gapSize: 0.04, blending: THREE.AdditiveBlending
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  };
  axes.add(make(new THREE.Vector3(-s,0,0), new THREE.Vector3(s,0,0), 0xff3333, 0.08));
  axes.add(make(new THREE.Vector3(0,-s,0), new THREE.Vector3(0,s,0), 0x33ff33, 0.08));
  axes.add(make(new THREE.Vector3(0,0,-s), new THREE.Vector3(0,0,s), 0x3388ff, 0.08));
  group.add(axes);
  return axes;
}

export function addInnerWireframe(parentMesh, geometry) {
  // Already handled by createOutline — no-op to avoid duplication
  return null;
}

export function applyIdleRotation(mesh, time, isSelected) {
  if (!isSelected) {
    mesh.rotation.y = time * 0.2;
    mesh.rotation.x = Math.sin(time * 0.12) * 0.08;
  }
}

export function updateEnhancements(data, time) {
  if (!data) return;
  if (data.orbitRing) data.orbitRing.rotation.y = time * 0.4;
  if (data.orbitRing2) data.orbitRing2.rotation.z = time * -0.25;
  if (data.innerShell) data.innerShell.rotation.y = time * -0.3;
  if (data.innerShell2) data.innerShell2.rotation.y = time * 0.5;
}
