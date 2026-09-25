import { AdditiveBlending, Color, ShaderMaterial, UniformsLib } from "three";
import vertexShader from "./shader.vert";
import fragmentShader from "./shader.frag";

type Props = {
  seed?: number;
  intensity?: number;
};

export const FLAME_PALETTE = {
  fire: {
    core: new Color(1.0, 0.92, 0.7),
    hot: new Color(1.0, 0.6, 0.08),
    mid: new Color(1.0, 0.28, 0.02),
    edge: new Color(0.5, 0.05, 0.01)
  },
  healing: {
    core: new Color(0.85, 1.0, 0.85),
    hot: new Color(0.4, 1.0, 0.35),
    mid: new Color(0.1, 0.85, 0.2),
    edge: new Color(0.02, 0.35, 0.08)
  }
};

export class FlameMaterial extends ShaderMaterial {
  constructor({ seed = 0, intensity = 1 }: Props = {}) {
    super({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      side: 2,
      fog: true,
      uniforms: {
        time: { value: 0 },
        seed: { value: seed },
        intensity: { value: intensity },
        colorCore: { value: FLAME_PALETTE.fire.core.clone() },
        colorMid: { value: FLAME_PALETTE.fire.mid.clone() },
        colorHot: { value: FLAME_PALETTE.fire.hot.clone() },
        colorEdge: { value: FLAME_PALETTE.fire.edge.clone() },
        ...UniformsLib["fog"]
      }
    });
  }

  setHealing(healing: boolean) {
    const palette = healing ? FLAME_PALETTE.healing : FLAME_PALETTE.fire;

    this.uniforms.colorCore.value.copy(palette.core);
    this.uniforms.colorMid.value.copy(palette.mid);
    this.uniforms.colorHot.value.copy(palette.hot);
    this.uniforms.colorEdge.value.copy(palette.edge);
  }
}
