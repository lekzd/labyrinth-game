import vert from "./vertex.glsl";
import frag from "./shader.frag";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { loads } from "@/loader.ts";
import { Color, MeshPhongMaterial, Vector2 } from "three";
import { textureRepeat } from "@/utils/textureRepeat";

export class PineMatetial extends CustomShaderMaterial<
  typeof MeshPhongMaterial
> {
  constructor(mw: number, mh: number) {
    super({
      baseMaterial: MeshPhongMaterial,
      color: new Color("#2c231c"),
      side: 0,
      shininess: 1,
      map: textureRepeat(loads.texture["Bark_06_basecolor.jpg"]!, 1, 1, mw, mh),
      normalMap: textureRepeat(
        loads.texture["Bark_06_normal.jpg"]!,
        1,
        1,
        mw,
        mh
      ),
      normalScale: new Vector2(5, 5),
      vertexShader: vert,
      fragmentShader: frag,
      silent: true,
    });
  }
}
