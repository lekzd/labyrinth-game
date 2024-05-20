uniform float fogNear; // Начальная дистанция тумана
uniform float fogFar; // Конечная дистанция тумана

varying vec2 vUv;
varying float vFogFactor;

void main() {
  vUv = uv;

  vec4 mvPosition = vec4(position, 1.0);
  vec4 modelViewPosition = modelViewMatrix * mvPosition;
  vFogFactor = smoothstep(fogNear, fogFar, length(modelViewPosition));

  gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
}