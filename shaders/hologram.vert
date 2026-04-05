varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    vPosition = position;
    gl_Position = projectionMatrix * mvPosition;
}
