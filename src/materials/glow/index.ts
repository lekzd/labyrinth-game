import * as THREE from 'three'
import { scene } from '../../scene'

import vertexShader from './shader.vert'
import fragmentRadialGradientShader from './radialCenterGradient.frag'
import fragmentOpaqueColorShader from './opaqueColor.frag'

type Props = {
  type: 'gradient' | 'opaque'
  opacity?: number
  color?: number
}

export class GlowMaterial extends THREE.ShaderMaterial {
  constructor({ type, color = 0xffff00, opacity = 0.5 }: Props) {
    super({
      uniforms: {
        color: { value: new THREE.Color(color) },
        radius: { value: 5 },
        opacity: { value: opacity },
        fogColor: {
          value: scene.fog.color,
        },
        fogNear: {
          value: scene.fog.near,
        },
        fogFar: {
          value: scene.fog.far,
        },
      },
      vertexShader,
      fragmentShader: type === 'opaque' ? fragmentOpaqueColorShader : fragmentRadialGradientShader,
      transparent: true,
      side: 2,
    })
  }
}