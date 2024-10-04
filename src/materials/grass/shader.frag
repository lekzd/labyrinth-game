varying float vNoise;
varying vec2 vUv;
varying vec3 vInstanceColor;

void main() {
	vec3 baseColor = vec3(csm_DiffuseColor.rgb);
	vec3 mixedColor = mix(baseColor, vec3(0.0, 0.0, 0.01), vInstanceColor.x);

	csm_DiffuseColor = vec4(mixedColor * vNoise, csm_DiffuseColor.a);
}