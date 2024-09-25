import * as CANNON from "cannon";
import { DynamicObject } from "@/types";
import { Object3D, Object3DEventMap } from "three";
import { createStone } from "./stone";
import { assign } from "@/utils/assign";
import { createPhysicBox } from "@/cannon";

function initPhysicBody() {
  const physicRadius = 6;
  return createPhysicBox(
    { x: physicRadius, y: 30, z: physicRadius },
    { mass: 0, type: CANNON.Body.STATIC }
  );
}

export class Stone {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = 0;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createStone();
    assign(this.mesh.position, props.position);
    this.physicBody = initPhysicBody();

    this.physicBody.position.set(
      props.position.x,
      props.position.y,
      props.position.z
    );
  }
  update(timeDelta: number) {}
}
