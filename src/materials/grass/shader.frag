varying float vNoise;
varying vec2 vUv;
varying vec3 vInstanceColor;

uniform sampler2D terrainImage; // Цвет террейна

void main() {
	vec3 baseColor = vec3(csm_DiffuseColor.rgb);
	vec3 terrainColor = texture2D(terrainImage, vec2(vInstanceColor)).rgb;
	vec3 mixedColor = mix(baseColor, terrainColor * 0.5, 0.5);

	csm_DiffuseColor = vec4(mix(mixedColor, vec3(0.0), 1.0 - vUv.y) * vNoise, csm_DiffuseColor.a);
}