uniform sampler2D tDiffuse;
uniform float time;
uniform vec2 resolution;
uniform vec3 tint;
uniform float lift;
uniform float saturation;
uniform float splitTone;
uniform float vignette;
uniform float grain;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  float luma = dot(color, vec3(0.299, 0.587, 0.114));

  // Пастель: приглушаем насыщенность
  color = mix(vec3(luma), color, saturation);

  // Тени поднимаются к цвету воздуха, света не трогаем
  color += tint * lift * (1.0 - color);

  // Сплит-тонинг: холодные тени, тёплые света
  vec3 cool = vec3(-0.015, 0.0, 0.03);
  vec3 warm = vec3(0.03, 0.012, -0.025);
  color += mix(cool, warm, smoothstep(0.15, 0.85, luma)) * splitTone;

  // Мягкая виньетка, тонированная в тёплое, а не в чёрное
  vec2 centered = (vUv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  float edge = smoothstep(0.35, 1.05, length(centered));
  color = mix(color, color * vec3(0.78, 0.7, 0.72), edge * vignette);

  // Зерно
  color += (hash(vUv * resolution + fract(time) * 100.0) - 0.5) * grain;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
