uniform vec3 directionalLightColor;
uniform vec3 fogColor; // Цвет тумана
uniform sampler2D terrainImage; // Цвет террейна
uniform sampler2D lightsImage; // Цвет динамического освещения

varying float vNoise;
varying vec2 vUv;
varying vec4 vViewPosition;
varying float vFogFactor;
varying vec3 vFogColor;
varying vec3 vInstanceColor;

void main() {
  vec3 baseColor = vec3(0.04, 0.24, 0.1);
  vec3 terrainColor = texture2D(terrainImage, vec2(vInstanceColor)).rgb;
  vec4 lightColor = texture2D(lightsImage, vec2(vInstanceColor));
  float clarity = (vUv.y * 0.875) + 0.125;
  vec3 mixedColor = mix(baseColor, terrainColor, 0.9) * clarity * vNoise;

  gl_FragColor = vec4(mix(fogColor, mixedColor + (lightColor.rgb * lightColor.a), (1.0 - vFogFactor)), 1.0);
}