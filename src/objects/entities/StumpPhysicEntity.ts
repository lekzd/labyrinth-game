import { createPhysicBox } from "@/cannon";
import { Object3D, Object3DEventMap } from "three";
import { PhysicEntity } from "./PhysicEntity";
import { Body } from "cannon";

interface StumpPhysicEntityProps {
  target: Object3D<Object3DEventMap>;
  physicY?: number;
  physicRadius?: number;
  mass?: number;
  type?: typeof Body.DYNAMIC | typeof Body.STATIC;
  count: number;
  radius: number;
  del: number;
}

export class StumpPhysicEntity extends PhysicEntity {
  constructor(props: StumpPhysicEntityProps) {
    const {
      target,
      physicY = 30,
      physicRadius = 11,
      mass = 0,
      type = Body.DYNAMIC,
      count,
      radius,
      del
    } = props;

    const stoneShape = new CANNON.Box(
      new CANNON.Vec3(physicRadius, physicY, physicRadius)
    );

    const boxBody = new CANNON.Body({ mass, type: CANNON.Body.STATIC });

    boxBody.position.set(target.position.x, 0, target.position.z);

    for (let i = 0; i < count; i++) {
      if (i === del) {
        continue;
      }
      const angle = (i * Math.PI * 2) / count;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      boxBody.addShape(stoneShape, new CANNON.Vec3(x, 0, z));
    }

    super({
      target,
      physicY,
      body: createPhysicBox(
        { x: physicRadius, y: physicY, z: physicRadius },
        { mass, type }
      )
    });
  }
}
