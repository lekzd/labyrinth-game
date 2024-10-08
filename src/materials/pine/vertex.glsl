varying vec4 vWorldPosition;

void main() {

  vec4 worldViewPosition = modelViewMatrix * vec4(position, 1.0);

  #ifdef USE_INSTANCING
    vWorldPosition = instanceMatrix * vec4(position, 1.0);
    csm_PositionRaw = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  #else
    vWorldPosition = vec4(position, 1.0);
    csm_PositionRaw = projectionMatrix * worldViewPosition;
  #endif
}
