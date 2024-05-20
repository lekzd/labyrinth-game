uniform vec3 color;
uniform float opacity;
uniform vec3 fogColor; // Цвет тумана

varying float vFogFactor;

void main() {
  gl_FragColor = vec4(mix(color, fogColor, vFogFactor), opacity);
}