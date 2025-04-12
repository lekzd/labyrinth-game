import {
  Group,
  Object3D,
  Object3DEventMap,
  Quaternion,
  Vector3,
  Vector3Like,
} from "three";
import { pickBy } from "@/utils/pickBy.ts";
import { loads } from "@/loader";
import { HeroProps } from "@/types";
import { StateEntity } from "@/entities/StateEntity";
import { HeroPhysicEntity } from "@/entities/HeroPhysicEntity";
import { ModelBasedPhysicEntity } from "@/entities/ModelBasedPhysicEntity";

export class PhysicModel {
  private target: Object3D<Object3DEventMap>;

  readonly props: HeroProps;
  readonly state: StateEntity;
  physicEntity: HeroPhysicEntity;

  constructor(props: HeroProps) {
    const model = loads.model[props.type] ?? loads.model_glb[props.type];

    if (!model) {
      throw Error(`No model with type "${props.type}"`);
    }

    this.state = new StateEntity(
      pickBy(props, [
        "id",
        "health",
        "mana",
        "speed",
        "mass",
        "attack",
        "position",
        "rotation"
      ])
    );

    this.props = props;
    this.target = initTarget(model, props);

    this.physicEntity = new ModelBasedPhysicEntity({
      target: this.target,
      physicY: 8,
      mass: 0
    });
  }

  get id() {
    return this.props.id;
  }

  get mesh() {
    return this.target;
  }

  get position() {
    return this.target.position;
  }

  get quaternion() {
    return this.target?.quaternion;
  }
  get rotation() {
    return this.target?.quaternion;
  }

  setPosition(position: Partial<Vector3Like>, lerpFactor = 1) {
    if (!position || !this.physicEntity.body.position) return;

    this.physicEntity.setPositionLerp(position, lerpFactor);
  }

  onStateChange(prev, next) {
    if (!next) return;
  }

  setRotation(angle: number) {
    const controlObject = this.target;
    const quaternion = new Quaternion();
    const axis = new Vector3(0, 1, 0);
    const npcRotation = controlObject.quaternion.clone();

    quaternion.setFromAxisAngle(axis, angle);
    npcRotation.multiply(quaternion);

    controlObject.quaternion.copy(npcRotation);

    this.physicEntity.body.quaternion.set(
      npcRotation.x,
      npcRotation.y,
      npcRotation.z,
      npcRotation.w
    );
  }

  update(timeInSeconds: number) {
  }
}

function initTarget(model: Group<Object3DEventMap>, props: HeroProps) {
  const target = model.clone();
  target.userData.id = props.id;
  Object.assign(target.position, props.position);
  Object.assign(target.quaternion, props.rotation);

  target.scale.multiplyScalar(0.05);
  target.updateMatrix();

  return target;
}
