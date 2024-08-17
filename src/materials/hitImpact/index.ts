import { Color, ShaderMaterial } from "three";
import vertexShader from "./shader.vert";
import fragmentShader from "./shader.frag";

export class HitImpactMaterial extends ShaderMaterial {
  constructor(color: Color) {
    super({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      uniforms: {
        time: { value: 0.0 },
        size: { value: 0.1 },
        color: { value: color.toArray() }
      }
    });
  }
}
