import { BoxGeometry, Mesh, MeshPhongMaterial, Object3DEventMap } from "three";
import { DynamicObject } from "@/types";
import * as CANNON from "cannon";
import { BoxPhysicEntity } from "@/entities/BoxPhysicEntity";

export class Box {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly physicEntity: BoxPhysicEntity;

  constructor(props: DynamicObject) {
    const halfExtents = new CANNON.Vec3(2, 2, 2);
    this.props = props;
    this.mesh = initMesh(halfExtents);
    this.physicEntity = new BoxPhysicEntity({
      target: this.mesh,
      physicY: 2,
      physicRadius: 2,
      mass: 100,
    });
  }
  update(time: number) {}
}

function initMesh(halfExtents: CANNON.Vec3) {
  const boxGeometry = new BoxGeometry(
    halfExtents.x * 2,
    halfExtents.y * 2,
    halfExtents.z * 2
  );
  return new Mesh(
    boxGeometry,
    new MeshPhongMaterial({ color: 0xffffff, fog: true })
  );
}
