import * as THREE from 'three'
import { GlowMaterial } from '../materials/glow';

export const createInteractivitySign = () => {
  const glowMaterial = new GlowMaterial({ type: 'opaque', opacity: 1, color: 0x666600 })

  const signMesh = new THREE.Mesh(new THREE.ConeGeometry( 1, 1, 3 ), glowMaterial);

  signMesh.rotation.x = Math.PI;

  return {
    mesh: signMesh,
    setFocused: (value: boolean) => {
      signMesh.material.uniforms.color.value = new THREE.Color(value ? 0xffff00 : 0x666600)
      signMesh.material.uniformsNeedUpdate = true
    } 
  }
}