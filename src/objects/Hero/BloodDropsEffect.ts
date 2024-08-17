import { Tween } from "@tweenjs/tween.js";
import {
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3
} from "three";
import { scene } from "@/scene";
import { DynamicObject } from "@/types";

export class BloodDropsEffect {
  constructor() {}

  run(person: DynamicObject, point: Vector3) {
    const mountedEffects: Mesh[] = [];
    const meshes: { mesh: Mesh; direction: Vector3 }[] = [];

    for (let i = 0; i < 10; i++) {
      const mesh = new Mesh(
        new SphereGeometry(0.3, 32, 32),
        new MeshBasicMaterial({ color: 0xff0000 })
      );
      mesh.position.copy(point);
      mesh.position.y = 10;

      const g = () => Math.sign(Math.random() - 0.5);

      const direction = new Vector3(g(), g(), g());
      direction.applyQuaternion(person.rotation);

      meshes.push({ mesh, direction });
      mountedEffects.push(mesh);
    }

    scene.add(...mountedEffects);

    const state = { v: 1.05 }

    const onUpdate = ({ v }: typeof state) => {
      meshes.forEach(({ mesh, direction }, i) => {
        const shift = direction.clone().multiplyScalar(i / 35 + v * 0.001);
        mesh.position.add(shift);
        mesh.scale.multiplyScalar(v);
      });
    };

    new Tween(state)
      .delay(300)
      .to({ v: 0.8 }, 700)
      .onUpdate(onUpdate)
      .onComplete(() => {
        mountedEffects.forEach((child) => {
          scene.remove(child);
        });
      })
      .start();
  }
}
