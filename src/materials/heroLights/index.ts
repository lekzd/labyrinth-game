import * as THREE from "three";
import fragmentShader from "./shader.frag";
import vertexShader from "./vertex.glsl";
import { loads } from "@/loader";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

type Uniforms = {
  time: THREE.IUniform<number>;
};

export class HeroLightsMaterial extends CustomShaderMaterial<
  typeof THREE.PointsMaterial
> {
  constructor(uniforms: Uniforms) {
    const map = loads.texture["dot.png"];

    super({
      baseMaterial: THREE.PointsMaterial,
      map,
      color: new THREE.Color('#e8de22'),
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      fog: true,
      opacity: 0.05,
      size: 10,
      silent: true,
      vertexShader,
    });
  }
}
