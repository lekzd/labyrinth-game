uniform float time;

attribute vec3 blade; // x — высота по травинке (0 корень, 1 кончик), y — фаза, z — гибкость
attribute float shade; // затенение пятнами, считается в GrassSystem по шуму карты

varying float vHeight;
varying float vShade;
varying float vTint;
varying float vGust;
varying float vBrightness;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  mat4 instanceWorld = modelMatrix * instanceMatrix;
  vec3 world = (instanceWorld * vec4(position, 1.0)).xyz;
  vec3 origin = (instanceWorld * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

  float h = blade.x;
  vec2 windDirection = normalize(vec2(1.0, 0.6));

  // Порывы — крупные волны, бегущие по полю; дрожь — мелкое колыхание каждой травинки
  vec2 gustUv = world.xz * 0.025 - windDirection * time * 0.2;
  float gust = noise(gustUv) * 0.7 + noise(gustUv * 2.3) * 0.3;
  float flutter = sin(time * 2.5 + blade.y * 6.2831 + world.x * 0.2) * 0.12;
  float bend = (gust * 1.4 + flutter) * h * h * blade.z;

  vec3 worldOffset = vec3(windDirection.x * bend, -bend * bend * 0.2, windDirection.y * bend);

  csm_Position = position + inverse(mat3(instanceWorld)) * worldOffset;

  vHeight = h;
  vShade = shade;
  vTint = hash(origin.xz);
  vGust = gust;
  vBrightness = 0.55 + hash(vec2(blade.y, origin.x)) * 0.45;
}
