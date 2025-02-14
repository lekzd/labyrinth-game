uniform vec3 color;
varying float vDistance;
varying vec2 vUv;

void main() {
  float dist = length(vUv.y - 0.5) * 4.0;
  gl_FragColor = vec4(color, (vDistance + vDistance) * (dist * pow(vDistance, 4.0)));
}