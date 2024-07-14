import { weaponType } from "@/loader";
import { Object3D, Object3DEventMap } from "three";

export const setWeaponPosition = (weaponObject: Object3D<Object3DEventMap>) => {
  const name = weaponObject.name as weaponType;

  switch (name) {
    case weaponType.katana: {
      weaponObject.position.set(0, -0.3, -0.03);
      weaponObject.rotateY(4.5);
      weaponObject.rotateX(1.3);
      break
    }
    case weaponType.swordLazer: {
      weaponObject.position.set(-0.4, 0.1, -0.1);
      weaponObject.rotateY(4.5);
      weaponObject.rotateX(1.3);
      break
    }
    case weaponType.dagger: {
      weaponObject.position.set(0, 0, -0.1);
      weaponObject.rotateY(4.5);
      weaponObject.rotateX(1.3);
      break
    }
    case weaponType.hammer: {
      weaponObject.position.set(0, 0, -0.1);
      weaponObject.rotateY(4.5);
      weaponObject.rotateX(1.3);
      break
    }
    case weaponType.sword: {
      weaponObject.position.set(-0.1, 0, -0.05);
      weaponObject.rotateY(5.8);
      weaponObject.rotateX(1.6);
      weaponObject.rotateZ(1.5);
      break
    }
    case weaponType.bow: {
      weaponObject.position.set(-0.1, -0.2, -0.05);
      weaponObject.rotateY(5.8);
      weaponObject.rotateX(2.7);
      weaponObject.rotateZ(2);
      break
    }
    case weaponType.staff2:
    case weaponType.staff: {
      weaponObject.position.set(-1.2, -0.5, -0.3);
      weaponObject.rotateY(4.5);
      weaponObject.rotateX(2.0);
      break
    }
    case weaponType.minigun: {
      weaponObject.position.set(-0.1, -0.2, -0.05);
      weaponObject.rotateY(1.4);
      weaponObject.rotateX(0);
      weaponObject.rotateZ(-2.7);
      break
    }
  }

  weaponObject.scale.multiplyScalar(0.01);
}