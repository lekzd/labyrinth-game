uniform float time;

varying vec2 vMapUv;
varying float vIndex;

attribute vec3 values; // Атрибут для размера частиц

void main() {
  vec4 pos = vec4(position, 1.0);

  vIndex = values.x;

  float size = mod(vIndex + time / 50.0, 300.0);

  if (size > 0.0 && size < 20.0) {
    csm_PointSize = size;
  } else {
    csm_PointSize = 0.0;
  }

  csm_PositionRaw = projectionMatrix * modelViewMatrix * pos;
}
