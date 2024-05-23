import vert from './vertex.glsl'
// import fragmentOpaqueColorShader from './opaqueColor.frag'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import {loads} from "@/loader.ts";
import { Color, FrontSide, MeshStandardMaterial, RepeatWrapping, Texture, Vector2 } from 'three';
import { frandom } from '@/utils/random';


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

export const createLeavesMaterial = () => {
  const prepareTexture = (texture: Texture, size: number) => {
    const map = texture.clone()

    map.wrapS = RepeatWrapping
    map.wrapT = RepeatWrapping
    map.repeat = new Vector2(size, size)

    return map
  }

  const alphaMap = prepareTexture(loads.texture["foliage.png"]!, 3)
  const map = prepareTexture(loads.texture['Hedge_001_BaseColor.jpg']!, 2)

  const colorComponents = [
    Math.floor(63 * frandom(0.5, 1.5)),
    Math.floor(109 * frandom(0.5, 1.0)),
    Math.floor(33 * frandom(0.5, 1.5)),
  ]

  return new CustomShaderMaterial({
    alphaMap,
    map,
    alphaTest: 0.8,
    baseMaterial: MeshStandardMaterial,
    color: new Color(`rgb(${colorComponents.join()})`),
    uniforms: uniforms,
    vertexShader: vert,
    shadowSide: FrontSide,
  });
}
