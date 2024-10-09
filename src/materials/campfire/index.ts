import * as THREE from "three";
import vertexShader from './vertex.glsl'
import { loads } from "@/loader";
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'

type Uniforms = {
  time: THREE.IUniform<number>;
};

export class CampfireMaterial extends CustomShaderMaterial<typeof THREE.PointsMaterial> {
  constructor(uniforms: Uniforms) {
    const map = loads.texture['dot.png'];

    super({
      baseMaterial: THREE.PointsMaterial,
      map,
      transparent: true,
      size: 5,
      color: new THREE.Color(`rgb(230, 73, 33)`),
      uniforms: uniforms,
      vertexShader,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      side: 2,
      fog: true,
      silent: true,
    })
  }
}
