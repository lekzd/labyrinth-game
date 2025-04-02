import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Object3DEventMap,
  Quaternion,
  SphereGeometry,
  TextureLoader,
  MeshStandardMaterial,
  Vector3,
  LoopOnce,
  Vector3Like,
  Color,
} from "three";
import { pickBy } from "@/utils/pickBy.ts";
import { loads, weaponType } from "@/loader";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as CANNON from "cannon";
import { Box, Torch } from "@/uses";
import { NpcAdditionalAnimations, NpcAnimationStates, NpcBaseAnimations } from "./NpcAnimationStates.ts";
import { HealthBar } from "./healthbar.ts";
import { HeroProps } from "@/types";
import { DissolveEffect } from "../../effects/DissolveEffect.ts";
import { shadowSetter } from "@/utils/shadowSetter";
import { initAnimations } from "@/utils/initAnimations";
import { StateEntity } from "../entities/StateEntity.ts";
import { HeroPhysicEntity } from "../entities/HeroPhysicEntity.ts";

type ElementsHero = {
  leftArm: Object3D<Object3DEventMap>;
  leftHand: Object3D<Object3DEventMap>;
  rightArm: Object3D<Object3DEventMap>;
  rightHand: Object3D<Object3DEventMap>;
  torch: Mesh<SphereGeometry, MeshBasicMaterial, Object3DEventMap>;
};

type AnimationName = keyof typeof NpcAnimationStates;
type AnimationControllers = Record<
  AnimationName,
  {
    action: AnimationAction;
    clip: AnimationClip;
  }
>;

interface StateAction extends ReturnType<typeof action> {
  Exit?: () => void;
}

export class Hero {
  private target: Object3D<Object3DEventMap>;
  private stateMachine: ReturnType<typeof CharacterFSM>;
  private stateMachine2: ReturnType<typeof CharacterFSM>;
  public mixer: AnimationMixer;
  public animated = true;
  private healthBar;
  public weaponObject: Object3D<Object3DEventMap>;

  readonly elementsHero: ElementsHero;
  readonly animations: AnimationClip[];
  readonly decceleration = new Vector3(-0.0005, -0.0001, -5.0);
  readonly acceleration = new Vector3(1, 0.25, 50.0);
  readonly velocity = new Vector3(0, 0, 0);
  readonly props: HeroProps;
  readonly state: StateEntity;
  physicEntity: HeroPhysicEntity;

  constructor(props: HeroProps) {
    const model = loads.model[props.type];

    if (!model) {
      throw Error(`No model with type "${props.type}"`);
    }

    this.state = new StateEntity(pickBy(props, [
      'id',
      'health',
      'mana',
      'speed',
      'mass',
      'attack',
      'position',
      'rotation',
    ]));

    this.props = props;
    this.target = initTarget(model, props);
    this.mixer = new AnimationMixer(this.target);
    this.mixer.timeScale = 1.5;
    this.animations = initAnimations(this.target, this.mixer);

    this.physicEntity = new HeroPhysicEntity({
      target: this.target,
      physicY: 8,
      physicRadius: 5,
      mass: 5,
    });

    this.elementsHero = initElementsHero(this.target);
    this.stateMachine = initStateMashine(this.animations);
    this.stateMachine2 = initStateMashine(this.animations);
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

    const boxMesh = (new Box({ id: 'asdasd', type: 'Box', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 0 } })).mesh;

    boxMesh.scale.set(0.2, 0.2, 0.2);

    this.weaponObject = loads.weapon_glb[weaponType]
      ? clone(loads.weapon_glb[weaponType]!)
      : boxMesh;

    this.weaponObject.scale.set(0.5, 0.5, 0.5);
    this.weaponObject.rotation.set(0, Math.PI * 0.3, Math.PI * 0.1);

    weaponRightHand.add(this.weaponObject);
  }

  setPosition(position: Partial<Vector3Like>, lerpFactor = 1) {
    if (!position || !this.physicEntity.body.position) return;

    const targetPosition = new CANNON.Vec3(
      position.x || this.physicEntity.body.position.x,
      position.y ? position.y + 8 : this.physicEntity.body.position.y,
      position.z || this.physicEntity.body.position.z
    );

    this.physicEntity.body.position.vadd(
      targetPosition.vsub(this.physicEntity.body.position).scale(lerpFactor),
      this.physicEntity.body.position
    );
  }

  onStateChange(prev, next) {
    if (!next) return;

    if (next.weapon) {
      this.props.weapon = next.weapon;
      this.initWeapon(next.weapon);
    }

    if (next.baseAnimation) {
      this.props.baseAnimation = next.baseAnimation;
      this.stateMachine.update(next.baseAnimation);
    }

    if (next.hasOwnProperty('additionsAnimation')) {
      this.props.additionsAnimation = next.additionsAnimation;
      this.stateMachine2.update(next.additionsAnimation ?? NpcAnimationStates.idle);
    }

    if (next.hasOwnProperty('health')) {
      this.props.health = next.health;
      this.healthBar.update(this.state.props);

      if (next.health <= 0) {
        return this.die();
      }
    }

    if (next.position) {
      this.setPosition(next.position, 0.01);
    }

    if (next.rotation) {
      const q2 = new Quaternion().copy(next.rotation);
      const q1 = new Quaternion()
        .copy(this.physicEntity.body.quaternion)
        .slerp(q2, 0.05);

      this.physicEntity.body.quaternion.set(
        q1.x,
        q1.y,
        q1.z,
        q1.w
      );
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

    console.log('attack', attack);

    this.state.makeHit(attack);
  }

  update(timeInSeconds: number) {
    if (!this.stateMachine.currentState) {
      return;
    }

    if (this.animated) {
      this.mixer.update(timeInSeconds);
    }
  }
}

function initTarget(model: Group<Object3DEventMap>, props: HeroProps) {
  const target = clone(model);
  target.userData.id = props.id;
  Object.assign(target.position, props.position);
  Object.assign(target.quaternion, props.rotation);

  target.scale.multiplyScalar(0.05);
  target.updateMatrix();

  const texture = new TextureLoader().load(
    `model/${target.name}_Texture.png`
  );

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
        receiveShadow: true,
      })
    }
  });

  return target;
}

function initElementsHero(target: Object3D<Object3DEventMap>): ElementsHero {
  const leftArm = target.getObjectByName("ShoulderL")!;
  const leftHand = target.getObjectByName("Fist1L")!;
  const rightArm = target.getObjectByName("ShoulderR")!;
  const rightHand = target.getObjectByName("Fist1R")!;
  const torch = new Torch().sphere;

  // Прикрепляем факел к руке персонажа
  if (leftHand && !target.name.startsWith("Skeleton")) {
    leftHand.add(torch);
  }

  return {
    leftArm,
    leftHand,
    rightArm,
    rightHand,
    torch
  };
}

function initStateMashine(animations: AnimationClip[]) {
  const stateMachine = CharacterFSM({ animations });
  stateMachine.setState("idle");
  return stateMachine;
}

function CharacterFSM({ animations }: { animations: AnimationControllers }) {
  let currentState: StateAction;

  const setState = (name: AnimationName) => {
    const prevState = currentState;

    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      //calling the Exit method from State
      if (prevState.Exit) prevState.Exit();
    }
    //creating new instance of a state class
    currentState = action(animations, name);

    //calling the Enter method from State
    currentState.Enter(prevState);
  };

  return {
    get currentState() {
      return currentState;
    },
    setState,
    update(next: AnimationName) {
      setState(next);
    }
  };
}

function action(animations: AnimationControllers, Name: AnimationName) {
  return {
    Name,
    Enter(prevState: StateAction) {
      const curAction = animations[Name]?.action || { play: () => {} };

      // TODO: разделить анимации на базовые из NpcBaseAnimations и дополнительные из NpcAdditionalAnimations
      // допольнительные анимации не должны вызывать crossFadeFrom
      // пример тут: https://threejs.org/examples/#webgl_animation_skinning_additive_blending
      if (prevState) {
        const prevAction = animations[prevState.Name]?.action;

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.weight = Name in NpcAdditionalAnimations ? 1000 : 500;

        if (Name in NpcAdditionalAnimations) {
          prevAction.stop();
          curAction.crossFadeFrom(prevAction, 0.1, true);
        } else {
          curAction.crossFadeFrom(prevAction, 0.5, true);
        }

        if (Name === NpcBaseAnimations.death) {
          curAction.clampWhenFinished = true;
          curAction.loop = LoopOnce;
        }

        curAction.play();
      } else {
        curAction.weight = Name in NpcAdditionalAnimations ? 500 : 1000;
        curAction.play();
      }
    }
  };
}
