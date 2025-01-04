import { Tween } from "@tweenjs/tween.js";
import { Hero } from "../objects/hero";
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
import { WEAPONS_CONFIG } from "@/config/WEAPONS_CONFIG";
import { weaponType } from "@/loader";

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

    const hitImpactFx = WEAPONS_CONFIG[weaponType.staff].hitImpactFx;

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

        const effect = hitImpactFx[result](sphere.position);

        mountedEffects.forEach((child) => {
          scene.remove(child);
        });

        new Tween({ i: 0 })
          .to({ i: 16 }, 200)
          .onUpdate(({ i }) => {
            effect.update(Math.floor(i));
          })
          .onComplete(() => {
            effect.remove();
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
