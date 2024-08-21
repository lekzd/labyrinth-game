import { Color, ColorRepresentation, ShaderMaterial } from "three";
import vertexShader from './shader.vert'
import fragmentShader from './shader.frag'

type Props = {
  color: ColorRepresentation
  pointsLimit: number
}

export class SwordPathMaterial extends ShaderMaterial {
  constructor({ color, pointsLimit }: Props) {
    super({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      uniforms: {
        color: {
          value: new Color(color)
        },
        pointsLimit: {
          value: pointsLimit
        }
      }
    })
  }
}