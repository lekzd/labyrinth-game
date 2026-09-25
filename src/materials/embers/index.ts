import { Color, ShaderMaterial, Texture, UniformsLib, Vector3 } from "three";
import vertexShader from "./shader.vert";
import fragmentShader from "./shader.frag";

type Props = {
  map: Texture;
  center: Vector3;
  radius: number;
  glow?: number;
};

const PALETTE = {
  fire: {
    hot: new Color(1.0, 0.55, 0.15),
    warm: new Color(0.7, 0.08, 0.01)
  },
  healing: {
    hot: new Color(0.5, 1.0, 0.45),
    warm: new Color(0.03, 0.45, 0.1)
  }
};

export class EmbersMaterial extends ShaderMaterial {
  constructor({ map, center, radius, glow = 1 }: Props) {
    super({
      vertexShader,
      fragmentShader,
      fog: true,
      uniforms: {
        time: { value: 0 },
        map: { value: map },
        center: { value: center },
        radius: { value: radius },
        glow: { value: glow },
        colorHot: { value: PALETTE.fire.hot.clone() },
        colorWarm: { value: PALETTE.fire.warm.clone() },
        ...UniformsLib["fog"]
      }
    });
  }

  setHealing(healing: boolean) {
    const palette = healing ? PALETTE.healing : PALETTE.fire;

    this.uniforms.colorHot.value.copy(palette.hot);
    this.uniforms.colorWarm.value.copy(palette.warm);
  }
}
