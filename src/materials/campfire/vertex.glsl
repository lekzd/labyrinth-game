uniform float time;
uniform float scale;

attribute vec3 values; // x — порядковый номер, y — размер, z — скорость

varying float vLife;

#include <fog_pars_vertex>

float HEIGHT = 22.0;

void main() {
  float offset = values.x * 17.0;

  // Каждая искра живёт по кругу: рождается у углей, взлетает, остывает и гаснет
  vLife = fract(time * (0.12 + values.z * 0.18) + offset);

  vec3 pos = position;
  float t = time + offset * 3.0;

  pos.y = vLife * HEIGHT * (0.5 + values.z * 0.5);
  // У каждой искры своё направление сноса, поверх — турбулентность
  float drift = fract(sin(values.x * 91.7) * 437.5) * 6.2831;
  pos.x += cos(drift) * vLife * 3.0 + sin(t * 1.7 + vLife * 6.0) * vLife * 1.2;
  pos.z += sin(drift) * vLife * 3.0 + cos(t * 1.3 + vLife * 5.0) * vLife * 1.2;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  gl_PointSize = values.y * (1.0 - vLife * 0.6) * (scale / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
