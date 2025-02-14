import { Tween } from "@tweenjs/tween.js";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Object3D,
  Points,
  ShaderMaterial,
  Vector3
} from "three";
import { scene } from "@/scene";
import { DynamicObject } from "@/types";
import { frandom } from "@/utils/random";
import { HitImpactMaterial } from "@/materials/hitImpact";

const PARTICLE_COUNT = 100;

export class BloodDropsEffect {
  particleMaterial: ShaderMaterial;

  constructor(color: Color) {
    this.particleMaterial = new HitImpactMaterial(color, 1);
  }

  run(person: DynamicObject, point: Vector3) {
    const mountedEffects: Object3D[] = [];

    // Создание массивов для хранения позиций частиц
    const positions = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
    const indexes = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
    const directions = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
    const shift = 1;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = frandom(-shift, shift); // Рандомное положение частицы по оси X
      positions[i + 1] = frandom(-shift, shift); // Рандомное положение частицы по оси Y
      positions[i + 2] = frandom(-shift, shift); // Рандомное положение частицы по оси Z

      indexes[i] = 10;
      indexes[i + 1] = 10;
      indexes[i + 2] = 10;

      directions[i] = Math.atan2(0 - positions[i + 1], 0 - positions[i]); // направление
      directions[i + 1] = Math.hypot(0 - positions[i], 0 - positions[i + 1]) * 2;  // дистанция от центра
      directions[i + 2] = 0;
    }

    // Создание буферной геометрии для частиц
    const particleGeometry = new BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute("values", new BufferAttribute(indexes, 3));
    particleGeometry.setAttribute("directions", new BufferAttribute(directions, 3));

    const particleSystem = new Points(particleGeometry, this.particleMaterial);

    particleSystem.position.copy(point);

    mountedEffects.push(particleSystem);

    scene.add(...mountedEffects);

    const state = { v: 0 };

    const onUpdate = ({ v }: typeof state) => {
      this.particleMaterial.uniforms.time.value = v;
      this.particleMaterial.uniformsNeedUpdate = true;
    };

    new Tween(state)
      .delay(100)
      .to({ v: 1 }, 700)
      .onUpdate(onUpdate)
      .onComplete(() => {
        mountedEffects.forEach((child) => {
          scene.remove(child);
        });
      })
      .start();
  }
}
