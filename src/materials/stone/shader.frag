
varying vec4 vWorldPosition;

void main() {
	float lightFactor = max((vWorldPosition.y * 0.05), 0.0);

	vec3 baseColor = mix(vec3(0.0, 0.002, 0.001), csm_DiffuseColor.rgb, lightFactor);

	csm_DiffuseColor = vec4(baseColor, 1.0);
}