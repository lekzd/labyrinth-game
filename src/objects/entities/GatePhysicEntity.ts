import { createPhysicBox } from "@/cannon";
import { Object3D, Object3DEventMap } from "three";
import { PhysicEntity } from "./PhysicEntity";
import { Body } from "cannon";

interface GatePhysicEntityProps {
  target: Object3D<Object3DEventMap>;
  physicY?: number;
  physicRadius?: number;
  mass?: number;
  type?: typeof Body.DYNAMIC | typeof Body.STATIC;
}

export class GatePhysicEntity extends PhysicEntity {
  doorShape: CANNON.Box;

  constructor(props: GatePhysicEntityProps) {
    const {
      target,
      physicY = 8,
      physicRadius = 5,
      mass = 5,
      type = Body.DYNAMIC
    } = props;

    const boxBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
    boxBody.addShape(
      new CANNON.Box(new CANNON.Vec3(5, 5, 5)),
      new CANNON.Vec3(-10, 0, 0)
    );
    const doorShape = new CANNON.Box(new CANNON.Vec3(5, 5, 2.5));
    boxBody.addShape(
      doorShape,
      new CANNON.Vec3(0, 0, 0)
    );
    boxBody.addShape(
      new CANNON.Box(new CANNON.Vec3(5, 5, 5)),
      new CANNON.Vec3(10, 0, 0)
    );

    super({
      target,
      physicY,
      body: createPhysicBox(
        { x: physicRadius, y: physicY, z: physicRadius },
        { mass, type }
      )
    });

    this.doorShape = doorShape;
  }
}
