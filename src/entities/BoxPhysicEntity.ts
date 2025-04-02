import { createPhysicBox } from "@/cannon";
import { Object3D, Object3DEventMap } from "three";
import { PhysicEntity } from "./PhysicEntity";
import { Body } from "cannon";

interface BoxPhysicEntityProps {
  target: Object3D<Object3DEventMap>;
  physicY?: number;
  physicRadius?: number;
  mass?: number;
  type?: typeof Body.DYNAMIC | typeof Body.STATIC;
}

export class BoxPhysicEntity extends PhysicEntity {
  constructor(props: BoxPhysicEntityProps) {
    const {
      target,
      physicY = 8,
      physicRadius = 5,
      mass = 5,
      type = Body.DYNAMIC
    } = props;

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
