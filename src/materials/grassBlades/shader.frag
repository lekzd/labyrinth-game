uniform vec3 colorRoot;
uniform vec3 colorTip;
uniform vec3 colorDry;

varying float vHeight;
varying float vShade;
varying float vTint;
varying float vGust;
varying float vBrightness;

void main() {
  // Корни в тени, к кончикам светлее; часть кустиков подсохшая
  vec3 tip = mix(colorTip, colorDry, smoothstep(0.6, 1.0, vTint));
  vec3 color = mix(colorRoot, tip, pow(vHeight, 1.5)) * vBrightness;

  // Там, где проходит порыв, травинки ловят больше света
  color *= 0.8 + vGust * 0.4;
  color = mix(color, vec3(0.0, 0.0, 0.01), vShade);

  csm_DiffuseColor = vec4(color, 1.0);
}
