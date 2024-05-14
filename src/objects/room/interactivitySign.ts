import * as THREE from 'three'
import { systems } from '../../systems';

export const createInteractivitySign = () => {
  const { camera } = systems.uiSettingsSystem

  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x333300) },
      viewVector: { value: camera.position }
    },
    vertexShader: `
      uniform vec3 viewVector;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector);
        intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        vec3 glow = glowColor;
        gl_FragColor = vec4(glow, 1.0);
      }
    `,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  const signMesh = new THREE.Mesh(new THREE.ConeGeometry( 1, 1, 3 ), glowMaterial);

  signMesh.rotation.x = Math.PI;

  return {
    mesh: signMesh,
    setFocused: (value: boolean) => {
      signMesh.material.uniforms.glowColor.value = new THREE.Color(value ? 0xffff00 : 0x666600)
      signMesh.material.uniformsNeedUpdate = true
    } 
  }
}