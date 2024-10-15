import { Tween } from "@tweenjs/tween.js";
import { Hero } from "../objects/hero/Hero";
import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3
} from "three";
import { scene } from "@/scene";
import { AbstactEffect } from "./AbstactEffect";
import { systems } from "@/systems";
import { WEAPONS_CONFIG } from "@/config/WEAPONS_CONFIG";
import { weaponType } from "@/loader";

export class ArrowEffect implements AbstactEffect {
  constructor() {}

  run(person: Hero) {
    const mountedEffects: Mesh[] = [];
    const weaponRight = person.weaponObject;
    const peakPoint = weaponRight.getObjectByName("peak_point");
    const weaponTopPosition = peakPoint?.position;

    if (!weaponTopPosition) {
      return;
    }

    const worldPosition = peakPoint.localToWorld(new Vector3(0, 0, 0));
    const geometry = new BoxGeometry(0.2, 0.2, 10);

    const weapon = person.props.weapon ?? weaponType.arrow;
    const hitImpactFx = WEAPONS_CONFIG[weapon].hitImpactFx;

    const tube = new Mesh(
      geometry,
      new MeshStandardMaterial({ color: 0xffffff })
    );

    tube.position.copy(worldPosition);

    const quaternion = person.rotation.clone();
    const weaponQuaternionOffset = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 1),
      -0.15
    );
    tube.quaternion.copy(quaternion.multiply(weaponQuaternionOffset));

    scene.add(tube);
    mountedEffects.push(tube);

    const direction = new Vector3(0, 0, 1); // направление вперед (ось Z)
    direction.applyQuaternion(tube.quaternion); // применяем кватернион

    const onUpdate = (state: { i: number }) => {
      const shift = direction.multiplyScalar(1.1 + state.i * 0.001);
      tube.position.add(shift);

      const result = state.i > 1 && systems.objectsSystem.checkPointHitColision(
        tube.position,
        person.id
      );

      if (result) {
        animation.stop();
        const fxEffect = hitImpactFx[result]?.(tube.position.sub(shift));

        new Tween({ i: 0 })
          .to({ i: 16 }, 200)
          .onUpdate(({ i }) => {
            fxEffect.update(Math.floor(i));
          })
          .onComplete(() => {
            mountedEffects.forEach((child) => {
              scene.remove(child);
            });
            fxEffect.remove();
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
