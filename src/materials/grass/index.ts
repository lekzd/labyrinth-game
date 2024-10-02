import * as THREE from "three";
import fragmentShader from "./shader.frag";
import vertexShader from "./vertex.glsl";
import { loads } from "@/loader";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { frandom } from "@/utils/random";

type Uniforms = {
  time: THREE.IUniform<number>;
};

export class GrassMaterial extends CustomShaderMaterial<
  typeof THREE.MeshStandardMaterial
> {
  constructor(uniforms: Uniforms) {
    const map = loads.texture["grass.png"];
    const alphaMap = loads.texture["grass.png"];
    const baseColor = new THREE.Color("#cdbc64");

    super({
      baseMaterial: THREE.MeshStandardMaterial,
      map,
      alphaMap,
      alphaTest: 0.01,
      color: baseColor.offsetHSL(
        frandom(-0.1, 0.1),
        frandom(-0.1, 0.1),
        frandom(-0.01, 0.01)
      ),
      uniforms: uniforms,
      vertexShader,
      fragmentShader,
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
      side: 2,
      silent: true
    });
  }
}
