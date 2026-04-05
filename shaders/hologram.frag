uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uSelected;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.5);

    // Scan beam
    float scanY = fract(uTime * 0.12);
    float scanBeam = smoothstep(0.03, 0.0, abs(vPosition.y - (scanY * 3.0 - 1.5))) * 0.3;

    float flicker = sin(uTime * 11.0) * 0.01 + 1.0;
    float sel = uSelected * 0.3;

    // Almost invisible faces — wireframe and nodes are the stars
    float faceAlpha = 0.02 + fresnel * 0.08 + scanBeam;
    float alpha = clamp(faceAlpha + sel * 0.1, 0.0, 0.25) * flicker;

    vec3 color = uColor * (0.3 + fresnel * 0.5 + sel);
    color += vec3(0.4, 0.8, 1.0) * scanBeam;

    gl_FragColor = vec4(color, alpha);
}
