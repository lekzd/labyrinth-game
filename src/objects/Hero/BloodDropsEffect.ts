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
    this.particleMaterial = new HitImpactMaterial(color);
  }

  run(person: DynamicObject, point: Vector3) {
    const mountedEffects: Object3D[] = [];

    // Создание массивов для хранения позиций частиц
    const positions = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
    const indexes = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
    const directions = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = frandom(-2, 2); // Рандомное положение частицы по оси X
      positions[i + 1] = frandom(-2, 2); // Рандомное положение частицы по оси Y
      positions[i + 2] = frandom(-2, 2); // Рандомное положение частицы по оси Z

      indexes[i] = i / positions.length;
      indexes[i + 1] = frandom(0.1, 1);
      indexes[i + 2] = frandom(0.1, 1);

      directions[i] = Math.atan2(0 - positions[i + 1], 0 - positions[i]);
      directions[i + 1] = Math.hypot(0 - positions[i], 0 - positions[i + 1]);
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
    particleSystem.position.y = 10;

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
