#include <fog_pars_vertex>

varying vec2 vUv;

void main() {
  vUv = uv;

  // Цилиндрический билборд: квад всегда повёрнут к камере, но остаётся вертикальным
  vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCamera = cameraPosition - center;
  toCamera.y = 0.0;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(toCamera)));

  vec3 worldPosition = center + right * position.x + vec3(0.0, position.y, 0.0);
  vec4 mvPosition = viewMatrix * vec4(worldPosition, 1.0);

  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
