uniform vec3 directionalLightColor;
uniform vec3 fogColor; // Цвет тумана

varying float vNoise;
varying vec2 vUv;
varying vec4 vViewPosition;
varying float vFogFactor;
varying vec3 vFogColor;

void main() {
  vec3 baseColor = vec3(0.31 * vNoise, 1.0 * vNoise, 0.5);

  float clarity = (vUv.y * 0.875) + 0.125;

  gl_FragColor = vec4(baseColor * clarity * vFogColor, 1.0);
}