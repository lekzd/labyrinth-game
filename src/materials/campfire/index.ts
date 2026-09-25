import * as THREE from "three";
import vertexShader from './vertex.glsl'
import fragmentShader from './shader.frag'
import { loads } from "@/loader";

type Uniforms = {
  time: THREE.IUniform<number>;
};

const PALETTE = {
  fire: {
    hot: new THREE.Color(1.0, 0.8, 0.4),
    cool: new THREE.Color(0.9, 0.12, 0.02)
  },
  healing: {
    hot: new THREE.Color(0.8, 1.0, 0.8),
    cool: new THREE.Color(0.05, 0.8, 0.2)
  }
};

export class CampfireMaterial extends THREE.ShaderMaterial {
  constructor(uniforms: Uniforms) {
    super({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      fog: true,
      uniforms: {
        ...uniforms,
        scale: { value: window.innerHeight * 0.5 * window.devicePixelRatio },
        map: { value: loads.texture['dot.png'] },
        colorHot: { value: PALETTE.fire.hot.clone() },
        colorCool: { value: PALETTE.fire.cool.clone() },
        ...THREE.UniformsLib["fog"]
      }
    })
  }

  setHealing(healing: boolean) {
    const palette = healing ? PALETTE.healing : PALETTE.fire;

    this.uniforms.colorHot.value.copy(palette.hot);
    this.uniforms.colorCool.value.copy(palette.cool);
    this.uniforms.map.value = healing
      ? loads.texture["plus.png"]
      : loads.texture["dot.png"];
  }
}
