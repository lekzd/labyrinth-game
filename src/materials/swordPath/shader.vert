attribute float pointIndex;
uniform float pointsLimit;
varying float vDistance;
varying vec2 vUv;

void main() {
  vUv = uv;
  vDistance = (pointIndex / pointsLimit);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}