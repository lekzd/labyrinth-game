import {
  Box3,
  Mesh,
  Object3D,
  Object3DEventMap,
  Vector3,
  Quaternion
} from "three";
import { PhysicEntity } from "./PhysicEntity";
import {
  Material,
  Body,
  Vec3,
  Box,
  Quaternion as CannonQuaternion
} from "cannon";

interface ModelBasedPhysicEntityProps {
  target: Object3D<Object3DEventMap>;
  physicY?: number;
  physicRadius?: number;
  mass?: number;
}

export class ModelBasedPhysicEntity extends PhysicEntity {
  constructor(props: ModelBasedPhysicEntityProps) {
    const { target, physicY = 8, mass = 5 } = props;
    const material = new Material("physic_object");
    material.friction = 0; // Устанавливаем трение на 0

    const group = new Body({
      type: Body.KINEMATIC,
      mass,
      fixedRotation: true,
      material,
      allowSleep: true
    });

    group.sleep();

    target.children.forEach((child) => {
      if (child instanceof Mesh) {
        const box = new Box3().setFromObject(child);
        const size = new Vector3();
        box.getSize(size);

        const centerWorld = new Vector3();
        box.getCenter(centerWorld);

        if (size.y < 20 || size.x > 500) {
          return;
        }

        const scaleFactor = 0.4;

        const shape = new Box(
          new Vec3(size.x * scaleFactor, size.y * scaleFactor, size.z * scaleFactor)
        );

        const quaternion = new Quaternion();
        child.getWorldQuaternion(quaternion);

        // Важно: поворот тоже нужно в local
        const groupQuat = new Quaternion();
        child.getWorldQuaternion(groupQuat);
        const localQuat = quaternion.clone().premultiply(groupQuat.invert());

        const cannonQuat = new CannonQuaternion(
          localQuat.x,
          localQuat.y,
          localQuat.z,
          localQuat.w
        );

        group.addShape(
          shape,
          new Vec3(centerWorld.x, centerWorld.y, centerWorld.z),
          cannonQuat
        );
      }
    });

    super({
      target,
      physicY,
      body: group,
      skipSyncMesh: true
    });
  }
}
