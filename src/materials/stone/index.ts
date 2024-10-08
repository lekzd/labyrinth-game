import vert from "./vertex.glsl";
import frag from "./shader.frag";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { loads } from "@/loader.ts";
import { MeshStandardMaterial, MeshStandardMaterialParameters } from "three";

export class StoneMatetial extends CustomShaderMaterial<
  typeof MeshStandardMaterial
> {
  constructor(props: MeshStandardMaterialParameters = {}) {
    const map = loads.texture["stone_wall_map.jpg"];

    const randomGray = () => {
      const base = 60;
      return (base << 16) + (base << 8) + base;
    };

    super({
      baseMaterial: MeshStandardMaterial,
      map,
      normalMap: loads.texture["stone_wall_bump.jpg"],
      aoMap: loads.texture["stone_wall_ao.jpg"],
      color: randomGray(),
      roughness: 0.8,
      metalness: 0.3,
      vertexShader: vert,
      fragmentShader: frag,
      silent: true,
      ...props,
    });
  }
}
