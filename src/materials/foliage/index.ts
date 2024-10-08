import vert from "./vertex.glsl";
import frag from "./shader.frag";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { loads } from "@/loader.ts";
import { Color, MeshStandardMaterial } from "three";
import { frandom } from "@/utils/random";

const uniforms = {
  u_effectBlend: { value: 1.0 },
  u_inflate: { value: 2.5 },
  u_scale: { value: 0.8 },
  u_windSpeed: { value: 1.0 },
  u_windTime: { value: 0.0 }
};

const animate = () => {
  uniforms.u_windTime.value = performance.now() / 500;
  requestAnimationFrame(animate);
};

animate();

export class FoliageMatetial extends CustomShaderMaterial<
  typeof MeshStandardMaterial
> {
  constructor() {
    const map = loads.texture["foliage.jpg"];
    const alphaMap = loads.texture["foliage_mask.jpg"];

    const baseColor = new Color(`#acca51`).offsetHSL(
      frandom(-0.1, 0.1),
      frandom(-0.1, 0.1),
      frandom(-0.05, 0.05)
    );

    super({
      baseMaterial: MeshStandardMaterial,
      map,
      alphaMap,
      alphaTest: 0.5,
      color: baseColor,
      uniforms: uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      side: 2,
      silent: true
    });
  }
}
