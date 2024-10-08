
varying vec4 vWorldPosition;
varying float v_shadowPower;

void main() {
	vec3 baseColor = mix(csm_DiffuseColor.rgb, vec3(0.0, 0.002, 0.001), v_shadowPower);

	csm_DiffuseColor = vec4(baseColor, 1.0);
}