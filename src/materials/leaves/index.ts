import * as THREE from 'three';
import vert from './vertex.glsl'
// import fragmentOpaqueColorShader from './opaqueColor.frag'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import {loads} from "@/loader.ts";
import { Color, FrontSide, MeshStandardMaterial } from 'three';


const uniforms = {
  u_effectBlend: { value: 1.0 },
  u_inflate: { value: 0.0 },
  u_scale: { value: 0.8 },
  u_windSpeed: { value: 1.0 },
  u_windTime: { value: 0.0 },
}

export const createLeavesMaterial = () => {
  return new CustomShaderMaterial({
    alphaMap: loads.texture["foliage.png"],
    alphaTest: 0.5,
    baseMaterial: MeshStandardMaterial,
    color: new Color('#3f6d21').convertLinearToSRGB(),
    uniforms: uniforms,
    vertexShader: vert,
    shadowSide: FrontSide,
  });
}
