uniform vec3 color;
uniform float radius;
uniform float opacity;
uniform vec3 fogColor; // Цвет тумана

varying vec2 vUv;
varying float vFogFactor;

void main() {
  float dist = length(vUv - vec2(0.5, 0.5)) * 2.0;
  float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
  gl_FragColor = vec4(mix(color, fogColor, vFogFactor), alpha * opacity);
}