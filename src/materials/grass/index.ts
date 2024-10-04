import * as THREE from "three";
import fragmentShader from "./shader.frag";
import vertexShader from "./vertex.glsl";
import { loads } from "@/loader";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

type Uniforms = {
  time: THREE.IUniform<number>;
};

export class GrassMaterial extends CustomShaderMaterial<
  typeof THREE.MeshStandardMaterial
> {
  constructor(uniforms: Uniforms) {
    const map = loads.texture["grass.png"];
    const alphaMap = loads.texture["grass.png"];

    super({
      baseMaterial: THREE.MeshStandardMaterial,
      map,
      alphaMap,
      alphaTest: 0.01,
      uniforms: uniforms,
      vertexShader,
      fragmentShader,
      roughness: 1,
      metalness: 0.4,
      flatShading: true,
      side: 2,
      silent: true
    });
  }
}
