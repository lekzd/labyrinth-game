uniform float u_effectBlend;
uniform float u_inflate;
uniform float u_scale;
uniform float u_windSpeed;
uniform float u_windTime;
varying vec4 vWorldPosition;
attribute float a_shadowPower;
varying float v_shadowPower;

float inverseLerp(float v, float minValue, float maxValue) {
  return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(v, inMin, inMax);
  return mix(outMin, outMax, t);
}

vec4 applyWind(vec4 v) {
  float posXZ = position.x + position.z;
  v.x += sin(u_windTime + posXZ);
  v.z += cos(u_windTime + posXZ);
  return v;
}

vec2 calcInitialOffsetFromUVs() {
  vec2 offset = vec2(
    remap(uv.x, 0.0, 1.0, -1.0, 1.0),
    remap(uv.y, 0.0, 1.0, -1.0, 1.0)
  );

  // Invert the vertex offset so it's positioned towards the camera.
  offset *= vec2(-1.0, 1.0);
  offset = normalize(offset) * u_scale;

  return offset;
}

vec3 inflateOffset(vec3 offset) {
  return offset + normal.xyz * u_inflate;
}

void main() {
  vec2 vertexOffset = calcInitialOffsetFromUVs();

  vec3 inflatedVertexOffset = inflateOffset(vec3(vertexOffset, 0.0));

  vec4 worldViewPosition = modelViewMatrix * vec4(position, 1.0);

  worldViewPosition += vec4(mix(vec3(0.0), inflatedVertexOffset, u_effectBlend), 0.0);

  worldViewPosition = applyWind(worldViewPosition);

  vWorldPosition = vec4(position, 1.0);

  v_shadowPower = a_shadowPower;

  csm_PositionRaw = projectionMatrix * worldViewPosition;
}
