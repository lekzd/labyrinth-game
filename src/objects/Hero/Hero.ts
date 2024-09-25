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
  Vector3,
  LoopOnce,
  Vector3Like,
  Color,
} from "three";
import { animationType, loads, weaponType } from "@/loader";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as CANNON from "cannon";
import { createPhysicBox } from "@/cannon";
import { Torch } from "@/uses";
import { NpcAdditionalAnimations, NpcAnimationStates, NpcBaseAnimations } from "./NpcAnimationStates.ts";
import { state } from "@/state.ts";
import { HealthBar } from "./healthbar.ts";
import { HeroProps } from "@/types";
import { DissolveEffect } from "../../effects/DissolveEffect.ts";
import { shadowSetter } from "@/utils/shadowSetter";

type Animations = Partial<Record<animationType, Group<Object3DEventMap>>>;

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

const PHYSIC_Y = 5;
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
  readonly physicBody: CANNON.Body;
  readonly decceleration = new Vector3(-0.0005, -0.0001, -5.0);
  readonly acceleration = new Vector3(1, 0.25, 50.0);
  readonly velocity = new Vector3(0, 0, 0);
  readonly props: HeroProps;

  constructor(props: HeroProps) {
    const model = loads.model[props.type];

    if (!model) {
      throw Error(`No model with type "${props.type}"`);
    }

    this.props = props;
    this.target = initTarget(model, props);
    this.mixer = new AnimationMixer(this.target);
    this.mixer.timeScale = 1.5;
    this.animations = initAnimations(this.target, this.mixer);

    this.physicBody = initPhysicBody(props.mass);
    this.elementsHero = initElementsHero(this.target);
    this.stateMachine = initStateMashine(this.animations);
    this.stateMachine2 = initStateMashine(this.animations);
    this.healthBar = HealthBar(props, this.target);
    correctionPhysicBody(this.physicBody, this.target);

    this.initWeapon(this.props.weapon);
  }

  get id() {
    return this.props.id;
  }

  get mesh() {
    return this.target;
  }

  get physicY() {
    return PHYSIC_Y;
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
    const weaponRightHand = this.target.getObjectByName("WeaponR")!;

    weaponRightHand.remove(...weaponRightHand.children);

    if (!weaponType) {
      return;
    }

    this.weaponObject = clone(loads.weapon_glb[weaponType]!);

    weaponRightHand.add(this.weaponObject);
  }

  setPosition(position: Partial<Vector3Like>, lerpFactor = 1) {
    if (!position || !this.physicBody.position) return;

    const targetPosition = new CANNON.Vec3(
      position.x || this.physicBody.position.x,
      position.y ? position.y + this.physicY : this.physicBody.position.y,
      position.z || this.physicBody.position.z
    );

    this.physicBody.position.vadd(
      targetPosition.vsub(this.physicBody.position).scale(lerpFactor),
      this.physicBody.position
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
      this.healthBar.update(this.props);

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

    this.physicBody.quaternion.copy(npcRotation);
  }

  die() {
    const effect = new DissolveEffect();
    effect.run(this.target, new Color("#FAEB9C"), 3);

    state.setState({ objects: { [this.id]: null } });
  }

  hit(by: HeroProps, point: Vector3) {
    const { attack = 0 } = by;

    const prev = state.objects[this.props.id]
      ? state.objects[this.props.id].health ?? 0
      : 0;

    if (prev <= 0) return;

    state.setState({ objects: { [this.props.id]: {
      health: prev - attack,
    } } });
  }

  update(timeInSeconds: number) {
    if (!this.stateMachine.currentState) {
      return;
    }
    const obj = state.objects[this.id];

    if (!obj) return;

    this.setPosition(obj.position, 0.01);

    if (obj.rotation) {
      const q2 = new Quaternion().copy(obj.rotation);
      const q1 = new Quaternion()
        .copy(this.physicBody.quaternion)
        .slerp(q2, 0.05);

      this.physicBody.quaternion.copy(q1);
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

  target.traverse((o) => {
    if (o instanceof Mesh) {
      o.material.map = new TextureLoader().load(
        `model/${target.name}_Texture.png`
      );
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
function initPhysicBody(mass?: number) {
  return createPhysicBox(
    { x: 2, y: PHYSIC_Y, z: 2 },
    { mass, fixedRotation: true }
  );
}
function initStateMashine(animations: AnimationClip[]) {
  const stateMachine = CharacterFSM({ animations });
  stateMachine.setState("idle");
  return stateMachine;
}
function initAnimations(
  target: Object3D<Object3DEventMap>,
  mixer: AnimationMixer
) {
  target.animations.forEach(function(clip) {
    for(var t = clip.tracks.length - 1; t >= 0; t--) {
      var track = clip.tracks[t];
      var isStatic = true;
      var inc = track.name.split(".")[1] == "quaternion" ? 4 : 3;

      for(var i = 0; i < track.values.length - inc; i += inc) {
        for(var j = 0; j < inc; j++) {
          if(Math.abs(track.values[i + j] - track.values[i + j + inc]) > 0.000001) {
            isStatic = false;
            //console.log("found change: " + clip.name + " -> " + track.name);
            break;
          }
        }

        if(!isStatic)
          break;
      }

      if(isStatic) {
        clip.tracks.splice(t, 1);
      }
    }
  });

  const animations = [
    ...target.animations.map((animation) => animation.clone()),
    ...pullAnimations(loads.animation)
  ];

  for (const clip of animations) {
    const name = clip.name
      .toLowerCase()
      .replace("characterarmature|", "") as AnimationName;
    animations[name] = {
      clip: clip,
      action: mixer.clipAction(clip)
    };
  }

  return animations;
}
function pullAnimations(animation: Animations): AnimationClip[] {
  const result = [];
  for (const name in animation) {
    const animationType = animation[name as keyof typeof animation];
    if (animationType) {
      for (const animation of animationType.animations) {
        animation.name = name;
        result.push(animation.clone());
      }
    }
  }
  return result;
}

function correctionPhysicBody(
  physicBody: CANNON.Body,
  target: Object3D<Object3DEventMap>
) {
  physicBody.position.set(
    target.position.x,
    target.position.y + PHYSIC_Y,
    target.position.z
  );
  physicBody.quaternion.copy(target.quaternion);
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
