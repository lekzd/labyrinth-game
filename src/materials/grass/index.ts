import * as THREE from "three";
import fragmentShader from "./shader.frag";
import vertexShader from './vertex.glsl'
import { loads } from "@/loader";
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import { frandom } from "@/utils/random";

type Uniforms = {
  time: THREE.IUniform<number>;
};

export class GrassMaterial extends CustomShaderMaterial<typeof THREE.MeshStandardMaterial> {
  constructor(uniforms: Uniforms) {
    const map = loads.texture['grass.png']
    const alphaMap = loads.texture["grass.png"]

    const colorComponents = [
      Math.floor(63 * frandom(0.5, 1.5)),
      Math.floor(109 * frandom(0.5, 1.0)),
      Math.floor(33 * frandom(0.5, 1.5)),
    ]

    super({
      baseMaterial: THREE.MeshStandardMaterial,
      map,
      alphaMap,
      alphaTest: 0.01,
      color: new THREE.Color(`rgb(${colorComponents.join()})`),
      uniforms: uniforms,
      vertexShader,
      fragmentShader,
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
      side: 2,
      silent: true,
    })
  }
}
