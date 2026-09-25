import { Color, Vector2 } from "three";
import fragmentShader from "./shader.frag";

/*
 * Финальная цветокоррекция в духе Journey. Стоит после OutputPass, поэтому работает уже в sRGB:
 * тени не проваливаются в чёрный, а растворяются в цвете воздуха, насыщенность приглушена,
 * тени холоднее, света теплее, по краям лёгкая виньетка и зерно (заодно убирает бандинг в тумане).
 * */
export const GradeShader = {
  name: "GradeShader",
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new Vector2(1, 1) },
    // Цвет воздуха (sRGB), в него поднимаются тени; задаёт EnvironmentSystem
    tint: { value: new Color(0.8, 0.85, 0.9) },
    lift: { value: 0.06 },
    saturation: { value: 1.0 },
    splitTone: { value: 1.0 },
    vignette: { value: 0.35 },
    grain: { value: 0.035 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader
};
