uniform vec3 directionalLightColor;
uniform vec3 fogColor; // Цвет тумана
uniform sampler2D terrainImage; // Цвет террейна
uniform sampler2D lightsImage; // Цвет динамического освещения
uniform sampler2D textureImage; // Цвет текстуры

varying float vNoise;
varying vec2 vUv;
varying float vFogFactor;
varying vec3 vInstanceColor;

void main() {
  vec4 baseColor = texture2D(textureImage, vUv);

  if (baseColor.a < 0.1) {
    discard;
  }

  vec3 terrainColor = texture2D(terrainImage, vec2(vInstanceColor)).rgb;
  vec4 lightColor = texture2D(lightsImage, vec2(vInstanceColor));
  float clarity = ((vUv.y - 0.45) * 3.0);
  vec3 mixedColor = terrainColor.r < 0.01
    ? terrainColor + (lightColor.rgb * (lightColor.g * 2.0))
    : (terrainColor * lightColor.r) + (lightColor.rgb * lightColor.a);

  gl_FragColor = vec4(mix(fogColor, mixedColor, (1.0 - vFogFactor)) * clarity * vNoise, 1.0);
}