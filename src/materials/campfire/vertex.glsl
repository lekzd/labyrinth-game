uniform float time;

varying vec2 vMapUv;
varying float vIndex;

attribute vec3 values; // Атрибут для размера частиц

float HEIGHT = 13.0;

void main() {
  vec4 pos = vec4(position, 1.0);

  vIndex = values.x;
  float YFactor = (mod(time + values.y + (values.x * HEIGHT), HEIGHT)) * 3.0;
  float animation = sin(time * 2.0 * (values.x * 2.0));

  pos.y = mod(pos.y + YFactor, HEIGHT * values.x);
  pos.x = (pos.x + animation) * ((HEIGHT - pos.y) * 0.1);
  pos.z = (pos.z + animation) * ((HEIGHT - pos.y) * 0.1);

  csm_PointSize = (HEIGHT - pos.y) * max(0.5, values.x);

  csm_PositionRaw = projectionMatrix * modelViewMatrix * pos;
}
