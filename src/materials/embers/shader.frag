uniform float time;
uniform sampler2D map;
uniform vec3 center;
uniform float radius;
uniform float glow;
uniform vec3 colorHot;
uniform vec3 colorWarm;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

#include <fog_pars_fragment>

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
  vec3 local = vWorldPosition - center;

  // Чем ближе к центру костра и ниже — тем горячее
  float proximity = 1.0 - clamp(length(local.xz) / radius, 0.0, 1.0);
  float lowness = 1.0 - clamp(local.y / 3.0, 0.0, 1.0);

  // Трещины: тонкие светящиеся прожилки из шума, медленно «дышат»
  vec2 p = vWorldPosition.xz * 1.3 + vWorldPosition.y * 0.7;
  float cracks = noise(p * 2.0) * 0.6 + noise(p * 5.0 + time * 0.3) * 0.4;
  cracks = smoothstep(0.62, 0.8, cracks);

  float pulse = 0.75 + 0.25 * noise(vec2(time * 1.5, vWorldPosition.x + vWorldPosition.z));
  float heat = clamp(proximity * (0.7 + lowness * 0.3) * glow, 0.0, 1.0);
  float ember = clamp(cracks * heat * heat * 2.0 + pow(heat, 4.0) * 0.5, 0.0, 1.0) * pulse;

  // Обугленная кора: освещение от огня сверху-сбоку, внизу тень
  vec3 bark = texture2D(map, vUv * vec2(1.0, 3.0)).rgb * 0.05;
  float light = 0.35 + 0.65 * clamp(dot(vNormal, normalize(vec3(0.0, 1.0, 0.0) - local * 0.1)), 0.0, 1.0);
  vec3 charred = bark * light;

  vec3 emberColor = mix(colorWarm, colorHot, smoothstep(0.4, 1.0, ember));

  gl_FragColor = vec4(charred + emberColor * ember * 1.5, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
