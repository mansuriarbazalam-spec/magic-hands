import * as THREE from 'three';

/**
 * Creates structured data-point particles — like the floating dots in Iron Man's interface.
 * Multiple layers: orbital ring particles + ambient field particles.
 */
export function createParticles(boundingRadius, count = 80) {
  const positions = new Float32Array(count * 3);
  const orbitData = [];

  for (let i = 0; i < count; i++) {
    let type;
    if (i < 30) type = 'orbit';       // structured orbit
    else if (i < 55) type = 'field';   // ambient field
    else type = 'near';                // close to surface

    const r = type === 'orbit' ? boundingRadius * (1.0 + (i % 3) * 0.25)
            : type === 'field' ? boundingRadius * (1.5 + Math.random() * 1.0)
            : boundingRadius * (0.7 + Math.random() * 0.4);

    const angle = Math.random() * Math.PI * 2;
    const yOff = (Math.random() - 0.5) * boundingRadius * (type === 'field' ? 2.0 : 0.8);
    const speed = type === 'orbit' ? 0.2 + Math.random() * 0.3
               : type === 'field' ? 0.05 + Math.random() * 0.1
               : 0.15 + Math.random() * 0.2;

    positions[i * 3] = r * Math.cos(angle);
    positions[i * 3 + 1] = yOff;
    positions[i * 3 + 2] = r * Math.sin(angle);

    orbitData.push({ r, angle, yOff, speed, type });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x66ccff,
    size: 0.025,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.userData.orbitData = orbitData;
  return points;
}

export function updateParticles(particles, time) {
  const positions = particles.geometry.attributes.position.array;
  const orbits = particles.userData.orbitData;
  if (!orbits) return;

  for (let i = 0; i < orbits.length; i++) {
    const o = orbits[i];
    const angle = o.angle + time * o.speed;
    const wobble = o.type === 'field' ? Math.sin(time * 0.5 + i * 0.7) * 0.15 : 0;

    positions[i * 3] = o.r * Math.cos(angle) + wobble;
    positions[i * 3 + 1] = o.yOff + Math.sin(time * 0.6 + i * 0.3) * 0.04;
    positions[i * 3 + 2] = o.r * Math.sin(angle) + wobble;
  }
  particles.geometry.attributes.position.needsUpdate = true;
}
