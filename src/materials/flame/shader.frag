uniform float time;
uniform float seed;
uniform float intensity;
uniform vec3 colorCore;
uniform vec3 colorMid;
uniform vec3 colorHot;
uniform vec3 colorEdge;

varying vec2 vUv;

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

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  float h = vUv.y;

  // Крупный шум раскачивает языки, мелкий — рвёт края
  float sway = fbm(vec2(vUv.x * 2.0 + seed, h * 1.5 - time * 1.4));
  float detail = fbm(vec2(vUv.x * 5.0 - seed, h * 3.0 - time * 2.6));

  float x = abs(vUv.x - 0.5 + (sway - 0.5) * 0.6 * h) * 2.0;

  // Форма капли: широкое основание, к верху сужается
  float width = mix(0.85, 0.1, pow(h, 0.7));
  float body = 1.0 - smoothstep(0.0, width, x);
  float bottom = smoothstep(0.0, 0.1, h);

  float heat = body * bottom * (1.0 - h * 0.5);
  heat -= detail * (0.35 + h * 0.75);
  heat = clamp(heat * 2.6, 0.0, 1.0);

  // Градиент жара: красные края → оранжевое тело → жёлтый → почти белое ядро
  vec3 color = mix(colorEdge, colorMid, smoothstep(0.05, 0.35, heat));
  color = mix(color, colorHot, smoothstep(0.35, 0.7, heat));
  color = mix(color, colorCore, smoothstep(0.85, 1.0, heat));

  float alpha = smoothstep(0.02, 0.35, heat) * (1.0 - h * 0.3);

  gl_FragColor = vec4(color * intensity, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
