import vert from './vertex.glsl'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import { loads } from "@/loader.ts";
import { Color, FrontSide, MeshStandardMaterial } from 'three';
import { frandom } from '@/utils/random';
import { textureRepeat } from '@/utils/textureRepeat';


const uniforms = {
  u_effectBlend: { value: 1.0 },
  u_inflate: { value: 2.5 },
  u_scale: { value: 0.8 },
  u_windSpeed: { value: 2.0 },
  u_windTime: { value: 0.0 },
}

const animate = () => {
  uniforms.u_windTime.value = performance.now() / 500
  requestAnimationFrame(animate)
}

animate()

export class LeavesMatetial extends CustomShaderMaterial<MeshStandardMaterial> {
  constructor() {
    const map = textureRepeat(loads.texture['Hedge_001_BaseColor.jpg']!, 1, 1, 2, 2)
    const alphaMap = textureRepeat(loads.texture["foliage.png"]!, 1, 1, 3, 3)

    const colorComponents = [
      Math.floor(63 * frandom(0.5, 1.5)),
      Math.floor(109 * frandom(0.5, 1.0)),
      Math.floor(33 * frandom(0.5, 1.5)),
    ]

    super({
      baseMaterial: MeshStandardMaterial,
      map,
      alphaMap,
      alphaTest: 0.8,
      color: new Color(`rgb(${colorComponents.join()})`),
      uniforms: uniforms,
      vertexShader: vert,
      shadowSide: FrontSide,
    })
  }
}
