import { BoxGeometry, Mesh, MeshPhongMaterial, Object3DEventMap } from "three";
import { DynamicObject } from "../../types/DynamicObject";
import * as CANNON from "cannon";

const PHYSIC_Y = 0;
export class Box {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly physicBody: CANNON.Body
  readonly physicY = PHYSIC_Y
  constructor(props: DynamicObject) {
    const halfExtents = new CANNON.Vec3(5, 5, 5);
    this.props = props;
    this.mesh = initMesh(halfExtents);
    this.physicBody = initPhysicBody(halfExtents)
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

function initPhysicBody(halfExtents: CANNON.Vec3) {
    const boxBody = new CANNON.Body({ mass: 10 });
    const boxShape = new CANNON.Box(halfExtents);
    boxBody.addShape(boxShape);
    return boxBody
}
