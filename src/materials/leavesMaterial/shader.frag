uniform vec3 directionalLightColor;
uniform vec3 fogColor; // Цвет тумана
uniform sampler2D terrainImage; // Цвет террейна
uniform sampler2D lightsImage; // Цвет динамического освещения
uniform sampler2D textureImage; // Цвет текстуры

varying float vNoise;
varying vec2 vUv;
varying vec4 vViewPosition;
varying float vFogFactor;
varying vec3 vFogColor;
varying vec3 vInstanceColor;

void main() {
  // vec3 baseColor = vec3(0.04, 0.24, 0.1);
  vec4 baseColor = texture2D(textureImage, vUv);

  if (baseColor.a < 0.1) {
    discard;
  }

  vec3 terrainColor = texture2D(terrainImage, vec2(vInstanceColor)).rgb;
  vec4 lightColor = texture2D(lightsImage, vec2(vInstanceColor));
  float clarity = ((vUv.y - 0.45) * 3.0);
  vec3 mixedColor = (mix(baseColor.rgb, terrainColor, 0.9));

  gl_FragColor = vec4(mix(fogColor, mixedColor + (lightColor.rgb * lightColor.a), (1.0 - vFogFactor)) * clarity * vNoise, 1.0);
}