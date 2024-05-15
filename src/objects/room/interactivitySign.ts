import * as THREE from 'three'

export const createInteractivitySign = () => {
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x333300) },
    },
    vertexShader: `
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      void main() {
        gl_FragColor = vec4(glowColor, 1.0);
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