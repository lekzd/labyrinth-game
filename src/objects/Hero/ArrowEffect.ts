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
    const geometry = new BoxGeometry(0.2, 0.2, 20);
    geometry.translate(0, 0, 20);

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
    };

    new Tween({ i: 0 })
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
