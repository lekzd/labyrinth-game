import vert from './vertex.glsl'
// import fragmentOpaqueColorShader from './opaqueColor.frag'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import {loads} from "@/loader.ts";
import { Color, FrontSide, MeshStandardMaterial, RepeatWrapping, Vector2 } from 'three';


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

export const createLeavesMaterial = () => {
  const alphaMap = loads.texture["foliage.png"]!.clone()

  alphaMap.wrapS = RepeatWrapping
  alphaMap.wrapT = RepeatWrapping
  alphaMap.repeat = new Vector2(3, 3)

  return new CustomShaderMaterial({
    alphaMap,
    alphaTest: 0.5,
    baseMaterial: MeshStandardMaterial,
    color: new Color('#3f6d21'),
    uniforms: uniforms,
    vertexShader: vert,
    shadowSide: FrontSide,
  });
}
