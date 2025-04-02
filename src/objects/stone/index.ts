import { DynamicObject } from "@/types";
import { Object3D, Object3DEventMap } from "three";
import { createStone } from "./stone";
import { assign } from "@/utils/assign";
import { StaticPhysicEntity } from "@/entities/StaticPhysicEntity";

export class Stone {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  physicEntity: StaticPhysicEntity;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createStone();
    assign(this.mesh.position, props.position);

    this.physicEntity = new StaticPhysicEntity({
      target: this.mesh,
      physicY: 30,
      physicRadius: 6,
    });
  }
  update(timeDelta: number) {}
}
