import * as THREE from "three";
import fragmentShader from "./shader.frag";
import vertexShader from "./vertex.glsl";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

type Uniforms = {
  time: THREE.IUniform<number>;
};

export class GrassBladesMaterial extends CustomShaderMaterial<
  typeof THREE.MeshStandardMaterial
> {
  constructor(uniforms: Uniforms) {
    super({
      baseMaterial: THREE.MeshStandardMaterial,
      uniforms: {
        ...uniforms,
        colorRoot: { value: new THREE.Color(0.002, 0.005, 0.002) },
        colorTip: { value: new THREE.Color(0.03, 0.065, 0.012) },
        colorDry: { value: new THREE.Color(0.07, 0.06, 0.018) }
      },
      vertexShader,
      fragmentShader,
      roughness: 1,
      metalness: 0,
      silent: true
    });
  }
}
