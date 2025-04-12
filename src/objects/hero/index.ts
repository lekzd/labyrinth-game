import {
  Group,
  Object3D,
  Object3DEventMap,
  Quaternion,
  TextureLoader,
  MeshStandardMaterial,
  Vector3,
  Vector3Like,
  Color
} from "three";
import { pickBy } from "@/utils/pickBy.ts";
import { loads, weaponType } from "@/loader";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Box } from "@/uses";
import { NpcAnimationStates } from "./NpcAnimationStates.ts";
import { HealthBar } from "./healthbar.ts";
import { HeroProps } from "@/types";
import { DissolveEffect } from "@/effects/DissolveEffect";
import { shadowSetter } from "@/utils/shadowSetter";
import { StateEntity } from "@/entities/StateEntity";
import { HeroPhysicEntity } from "@/entities/HeroPhysicEntity";
import { AnimationEntity } from "@/entities/AnimationEntity.ts";
import { state } from "@/state.ts";

export class Hero {
  private target: Object3D<Object3DEventMap>;
  private healthBar;
  public weaponObject: Object3D<Object3DEventMap>;

  readonly decceleration = new Vector3(-0.0005, -0.0001, -5.0);
  readonly acceleration = new Vector3(1, 0.25, 50.0);
  readonly velocity = new Vector3(0, 0, 0);
  readonly props: HeroProps;
  readonly state: StateEntity;
  physicEntity: HeroPhysicEntity;
  animationEntity: AnimationEntity;

  constructor(props: HeroProps) {
    const model = loads.model[props.type];

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

    this.animationEntity = new AnimationEntity({
      target: this.target
    });

    this.physicEntity = new HeroPhysicEntity({
      target: this.target,
      physicY: 8,
      physicRadius: 5,
      mass: 5
    });

    this.healthBar = HealthBar(this.state.props, this.target);

    this.initWeapon(this.props.weapon);
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

  private initWeapon(weaponType?: weaponType) {
    const weaponRightHand = this.target.getObjectByName("handR_end");

    if (!weaponRightHand) {
      return;
    }

    weaponRightHand.remove(...weaponRightHand.children);

    if (!weaponType) {
      return;
    }

    if (loads.weapon_glb[weaponType]) {
      this.weaponObject = clone(loads.weapon_glb[weaponType]!);
    } else {
      const boxMesh = new Box({
        id: "asdasd",
        type: "Box",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 0 }
      }).mesh;
      const group = new Group();
      group.add(boxMesh);

      boxMesh.scale.set(0.1, 0.1, 0.1);

      this.weaponObject = group;
    }

    this.weaponObject.scale.set(0.5, 0.5, 0.5);
    this.weaponObject.rotation.set(0, Math.PI * 0.3, Math.PI * 0.1);

    weaponRightHand.add(this.weaponObject);
  }

  setPosition(position: Partial<Vector3Like>, lerpFactor = 1) {
    if (!position || !this.physicEntity.body.position) return;

    this.physicEntity.setPositionLerp(position, lerpFactor);
  }

  onStateChange(prev, next) {
    if (!next) return;

    if (next.weapon) {
      this.props.weapon = next.weapon;
      this.initWeapon(next.weapon);
    }

    if (next.baseAnimation) {
      this.props.baseAnimation = next.baseAnimation;
      this.animationEntity.setBaseAnimation(next.baseAnimation);
    }

    if (next.hasOwnProperty("additionsAnimation")) {
      this.props.additionsAnimation = next.additionsAnimation;
      this.animationEntity.setAdditionsAnimation(
        next.additionsAnimation ?? NpcAnimationStates.idle
      );
    }

    if (next.hasOwnProperty("health")) {
      this.props.health = next.health;
      this.healthBar.update(this.state.props);

      if (next.health <= 0) {
        return this.die();
      }
    }
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

  die() {
    const effect = new DissolveEffect();
    effect.run(this.target, new Color("#FAEB9C"), 3);

    this.state.makeKill();
  }

  hit(by: HeroProps, point: Vector3) {
    const { attack = 0 } = by;

    this.state.makeHit(attack);

    if (this.state.props.health <= 0) {
      this.die();
    }
  }

  update(timeInSeconds: number) {
    const obj = state.objects[this.id];

    if (!obj || !obj.position) return;

    this.physicEntity.setPositionLerp(obj.position, 0.01);

    if (obj.rotation) {
      const q2 = new Quaternion().copy(obj.rotation);
      const q1 = new Quaternion()
        .copy(this.physicEntity.body.quaternion)
        .slerp(q2, 0.05);

      this.physicEntity.body.quaternion.set(q1.x, q1.y, q1.z, q1.w);
    }

    this.animationEntity.update(timeInSeconds);
  }
}

function initTarget(model: Group<Object3DEventMap>, props: HeroProps) {
  const target = clone(model);
  target.userData.id = props.id;
  Object.assign(target.position, props.position);
  Object.assign(target.quaternion, props.rotation);

  target.scale.multiplyScalar(0.05);
  target.updateMatrix();

  const texture = new TextureLoader().load(`model/${target.name}_Texture.png`);

  const material = new MeshStandardMaterial({
    map: texture,
    metalness: 0,
    roughness: 1
  });

  target.traverse((o) => {
    if (o.isMesh) {
      o.material = material;
      o.material.needsUpdate = true;

      shadowSetter(o, {
        castShadow: true,
        receiveShadow: true
      });
    }
  });

  return target;
}
