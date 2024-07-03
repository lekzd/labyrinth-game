import vert from './vertex.glsl'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import { loads } from "@/loader.ts";
import { Color, MeshStandardMaterial } from 'three';
import { frandom } from '@/utils/random';


const uniforms = {
  u_effectBlend: { value: 1.0 },
  u_inflate: { value: 2.5 },
  u_scale: { value: 0.8 },
  u_windSpeed: { value: 1.0 },
  u_windTime: { value: 0.0 },
}

const animate = () => {
  uniforms.u_windTime.value = performance.now() / 500
  requestAnimationFrame(animate)
}

animate()

export class LeavesMatetial extends CustomShaderMaterial<MeshStandardMaterial> {
  constructor() {
    const map = loads.texture['Hedge_001_BaseColor.jpg']
    const alphaMap = loads.texture["foliage.png"]

    const colorComponents = [
      Math.floor(63 * frandom(0.5, 1.5)),
      Math.floor(109 * frandom(0.5, 1.0)),
      Math.floor(33 * frandom(0.5, 1.5)),
    ]

    super({
      baseMaterial: MeshStandardMaterial,
      map,
      alphaMap,
      alphaTest: 0.5,
      color: new Color(`rgb(${colorComponents.join()})`),
      uniforms: uniforms,
      vertexShader: vert,
      side: 2,
    })
  }
}
