uniform float time;

varying vec2 vMapUv;
varying float vIndex;

attribute vec3 values; // Атрибут для размера частиц

float HEIGHT = 50.0;

void main() {
  vec4 pos = vec4(position, 1.0);

  vIndex = values.x;
  float YFactor = (mod(time, HEIGHT)) * 3.0;

  pos.y = mod(pos.y + YFactor + vIndex, HEIGHT) - 2.0;
  pos.x = pos.x + sin(pos.y) + cos(pos.z);

  csm_PointSize = values.y - pos.y / 4.0;

  csm_PositionRaw = projectionMatrix * modelViewMatrix * pos;
}
