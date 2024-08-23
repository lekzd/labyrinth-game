import { Tween } from "@tweenjs/tween.js";
import { Hero } from "../objects/hero/Hero";
import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Quaternion,
  SphereGeometry,
  Vector3
} from "three";
import { scene } from "@/scene";
import { AbstactEffect } from "./AbstactEffect";
import { systems } from "@/systems";
import { DissolveEffect } from "./DissolveEffect";

function createTorch() {
  const torch = new PointLight(0x00ccff, 2000, 100); // Цвет, интенсивность, дистанция факела
  torch.position.set(0, 0, 0); // Позиция факела (относительно руки персонажа)
  return torch;
}

export class MagicBallEffect implements AbstactEffect {
  torch: PointLight;

  constructor() {
    this.torch = createTorch();
  }

  run(person: Hero) {
    const mountedEffects: Mesh[] = [];
    const weaponRight = person.weaponObject;
    const peakPoint = weaponRight.getObjectByName("peak_point");
    const weaponTopPosition = peakPoint?.position;

    if (!weaponTopPosition) {
      return;
    }

    const sphere = new Mesh(
      new SphereGeometry(1, 32, 32), // Геометрия сферы
      new MeshBasicMaterial({ color: 0x1cfff4 })
    );

    sphere.add(this.torch);

    const quaternion = person.rotation.clone();
    const weaponQuaternionOffset = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 1),
      -0.15
    );
    sphere.quaternion.copy(quaternion.multiply(weaponQuaternionOffset));

    scene.add(sphere);
    mountedEffects.push(sphere);

    const direction = new Vector3(0, 0, 1); // направление вперед (ось Z)
    direction.applyQuaternion(sphere.quaternion); // применяем кватернион

    const onUpdate = (state: { i: number }) => {
      const worldPosition = peakPoint.localToWorld(new Vector3(0, 0, 0));
      sphere.position.copy(worldPosition);

      const shift = direction.multiplyScalar(1.1 + state.i * 0.001);
      sphere.position.add(shift);

      const result = systems.objectsSystem.checkPointHitColision(
        sphere.position,
        person.id
      );

      if (result) {
        animation.stop();

        const effect = new DissolveEffect();
        effect.run(sphere, new Color('#1cfff4'), 3);

        mountedEffects.forEach((child) => {
          scene.remove(child);
        });

        const half = 4;

        new Tween({ i: 1 })
          .to({ i: half * 2 }, 1000)
          .onUpdate(({ i }) => {
            const v = Math.pow(Math.min(i, 2), 2)
            effect.target.scale.set(v, v, v);
            effect.target.rotation.set(i, i, i);
          })
          .start();
        return;
      }
    };

    const animation = new Tween({ i: 0 })
      .delay(300)
      .to({ i: 10 }, 1500)
      .onUpdate(onUpdate)
      .onComplete(() => {
        mountedEffects.forEach((child) => {
          scene.remove(child);
        });
      })
      .start();
  }
}
