uniform vec3 color;
varying float vDistance;
varying vec2 vUv;

void main() {
  float dist = length(vUv - vec2(0.5, 0.5));
  gl_FragColor = vec4(color, (vDistance + vDistance) * dist);
}