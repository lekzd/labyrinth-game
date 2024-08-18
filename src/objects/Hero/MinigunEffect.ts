import { Tween } from "@tweenjs/tween.js";
import { Hero } from "./Hero";
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

export class MinigunEffect implements AbstactEffect {
  constructor() {}

  run(person: Hero) {
    const mountedEffects: Mesh[] = [];
    const weaponRight = person.weaponObject;
    const peakPoint = weaponRight.getObjectByName("peak_point");
    const weaponTopPosition = peakPoint?.position;

    if (!weaponTopPosition) {
      return;
    }

    const onUpdate = () => {
      const worldPosition = peakPoint.localToWorld(new Vector3(0, 0, 0));
      const geometry = new BoxGeometry(0.2, 0.2, 100);
      geometry.translate(0, 0, 50);

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

      const fr = Math.PI / 150;

      tube.rotateY(-fr + Math.random() * fr * 2);

      const result = systems.objectsSystem.checkPointHitColision(tube.position);

      if (result) {
        animation.stop();
        setTimeout(() => {
          mountedEffects.forEach((child) => {
            scene.remove(child);
          });
        }, 1000);
        return;
      }

      mountedEffects.forEach((child) => {
        scene.remove(child);
      });

      scene.add(tube);
      mountedEffects.push(tube);
    };

    const animation = new Tween({ i: 0 })
      .delay(300)
      .to({ i: 10 }, 700)
      .onUpdate(onUpdate)
      .onComplete(() => {
        mountedEffects.forEach((child) => {
          scene.remove(child);
        });
      })
      .start();
  }
}
