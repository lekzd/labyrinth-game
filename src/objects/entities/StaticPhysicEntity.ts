import { createPhysicBox } from "@/cannon";
import { Object3D, Object3DEventMap } from "three";
import { BasePhysicEntity } from "./BasePhysicEntity";
import { Body } from "cannon";

interface StaticPhysicEntityProps {
  target: Object3D<Object3DEventMap>;
  physicRadius?: number;
  physicY?: number;
}

export class StaticPhysicEntity extends BasePhysicEntity {
  constructor(props: StaticPhysicEntityProps) {
    const { target, physicRadius = 5, physicY = 8 } = props;

    super({
      target,
      physicY,
      body: createPhysicBox(
        { x: physicRadius, y: physicY, z: physicRadius },
        { mass: 0, type: Body.STATIC }
      )
    });
  }
}
