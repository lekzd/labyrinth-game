import { Vec3 } from "cannon";
import { Object3D, Object3DEventMap, Vector3Like } from "three";

interface BasePhysicEntityProps {
  target: Object3D<Object3DEventMap>,
  physicY: number
  body: CANNON.Body
}

export class BasePhysicEntity {
  target: Object3D<Object3DEventMap>
  physicY: number
  body: CANNON.Body

  constructor(props: BasePhysicEntityProps) {
    this.target = props.target;
    this.physicY = props.physicY;
    this.body = props.body;

    this.syncBody();
    this.syncMesh();
  }

  syncBody() {
    this.body.position.set(
      this.target.position.x,
      this.target.position.y + this.physicY,
      this.target.position.z
    );

    this.body.quaternion.set(
      this.target.quaternion.x,
      this.target.quaternion.y,
      this.target.quaternion.z,
      this.target.quaternion.w
    );
  }

  syncMesh() {
    this.target.position.set(
      this.body.position.x,
      this.body.position.y - this.physicY,
      this.body.position.z
    );

    this.target.quaternion.copy(this.body.quaternion);
  }

  setPosition(position: Partial<Vector3Like>) {
    this.body.position.set(
      position.x || this.body.position.x,
      position.y ? position.y + this.physicY : this.body.position.y,
      position.z || this.body.position.z
    );
  }

  setPositionLerp(position: Partial<Vector3Like>, lerpFactor = 1) {
    const targetPosition = new Vec3(
      position.x || this.body.position.x,
      position.y ? position.y + this.physicY : this.body.position.y,
      position.z || this.body.position.z
    );

    this.body.position.vadd(
      targetPosition.vsub(this.body.position).scale(lerpFactor),
      this.body.position
    );
  }
}
