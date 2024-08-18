import { Color, ShaderMaterial } from "three";
import vertexShader from "./shader.vert";
import fragmentShader from "./shader.frag";

export class HitImpactMaterial extends ShaderMaterial {
  constructor(color: Color, animationEnd: number = 1) {
    super({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      uniforms: {
        time: { value: 0.0 },
        size: { value: 0.1 },
        animationEnd: { value: animationEnd },
        color: { value: color.toArray() }
      }
    });
  }
}
