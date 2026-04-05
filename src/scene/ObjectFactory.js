import HoloCube from '../objects/primitives/HoloCube.js';
import HoloSphere from '../objects/primitives/HoloSphere.js';
import HoloCylinder from '../objects/primitives/HoloCylinder.js';
import HoloTorus from '../objects/primitives/HoloTorus.js';
import HoloCone from '../objects/primitives/HoloCone.js';
import HoloPlane from '../objects/primitives/HoloPlane.js';

const PRIMITIVES = {
  cube: HoloCube,
  sphere: HoloSphere,
  cylinder: HoloCylinder,
  torus: HoloTorus,
  cone: HoloCone,
  plane: HoloPlane
};

export function createPrimitive(type, position) {
  const Cls = PRIMITIVES[type];
  if (!Cls) throw new Error(`Unknown primitive type: ${type}`);
  return new Cls(position);
}

export function getAvailableTypes() {
  return Object.keys(PRIMITIVES);
}
