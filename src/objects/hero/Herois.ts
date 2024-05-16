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
  Vector3Like,
} from "three";
import { animationType, loads, modelType } from "../../loader";
import { DynamicObject } from "../../types/DynamicObject";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as CANNON from "cannon";
import { createPhysicBox, physicWorld } from "../../cannon";
import { createTorch } from "../torch";
import { NpcAnimationStates } from "./NpcAnimationStates";
import { state } from "../../state.ts";
import { HealthBar } from "./healthbar.ts";

interface HeroisProps extends DynamicObject {
  type: modelType;
}

type Animations = Partial<Record<animationType, Group<Object3DEventMap>>>;

type ElementsHerois = {
  leftArm: Object3D<Object3DEventMap>;
  leftHand: Object3D<Object3DEventMap>;
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
export class Herois {
  private target: Object3D<Object3DEventMap>;
  private elementsHerois: ElementsHerois;
  private stateMachine: any;
  private mixer: AnimationMixer;
  private healthBar;

  readonly animations: AnimationClip[];
  readonly physicBody: CANNON.Body;
  readonly decceleration = new Vector3(-0.0005, -0.0001, -5.0);
  readonly acceleration = new Vector3(1, 0.25, 50.0);
  readonly velocity = new Vector3(0, 0, 0);
  readonly props: HeroisProps;

  constructor(props: HeroisProps) {
    const model = loads.model[props.type];

    if (!model) {
      throw Error(`No model with type "${props.type}"`);
    }

    this.props = props;
    this.target = initTarget(model, props);
    this.mixer = new AnimationMixer(this.target);
    this.animations = initAnimations(this.target, this.mixer);
    // console.log(this.target)
    this.physicBody = initPhysicBody(props.mass);
    this.elementsHerois = initElementsHerois(this.target);
    this.stateMachine = initStateMashine(this.animations);
    this.healthBar = HealthBar({
        health: props.health,
        mana: props.mana,
      },
      this.target
    );
    correctionPhysicBody(this.physicBody, this.target);
    physicWorld.addBody(this.physicBody);
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

  setPosition(position: Partial<Vector3Like>) {
    this.physicBody.position.set(
      position.x || this.physicBody.position.x,
      position.y ? position.y + this.physicY : this.physicBody.position.y,
      position.z || this.physicBody.position.z
    );
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

  update(timeInSeconds: number) {
    if (!this.stateMachine.currentState) {
      return;
    }
    const obj = state.objects[this.id];
    this.healthBar.update(obj);
    this.stateMachine.update(timeInSeconds, obj.state);

    this.setPosition(obj.position);

    this.physicBody.quaternion.copy(obj.rotation);
    Object.assign(this.target.quaternion, obj.rotation);

    if (this.mixer) this.mixer.update(timeInSeconds);

    // обновляем позицию руки с факелом,
    // чтобы она не зависела от текущей анимации
    this.elementsHerois.leftArm.rotation.x = Math.PI * -0.3;
  }
}

function initTarget(model: Group<Object3DEventMap>, props: HeroisProps) {
  const target = clone(model);
  target.userData.id = props.id;
  Object.assign(target.position, props.position);
  Object.assign(target.quaternion, props.rotation);

  target.scale.multiplyScalar(0.05);
  target.updateMatrix();

  target.traverse((o) => {
    if (o.isMesh) {
      o.material.map = new TextureLoader().load(
        `model/${target.name}_Texture.png`
      );
      o.material.needsUpdate = true;

      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return target;
}
function initElementsHerois(
  target: Object3D<Object3DEventMap>
): ElementsHerois {
  const leftArm = target.getObjectByName("ShoulderL")!;
  const leftHand = target.getObjectByName("Fist1L")!;
  const torch = createTorch();
  // Прикрепляем факел к руке персонажа
  leftHand.add(torch);
  return {
    leftArm,
    leftHand,
    torch,
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
  const animations = [
    ...target.animations.map((animation) => animation.clone()),
    ...pullAnimations(loads.animation),
  ];

  for (const clip of animations) {
    const name = clip.name
      .toLowerCase()
      .replace("characterarmature|", "") as AnimationName;
    animations[name] = {
      clip: clip,
      action: mixer.clipAction(clip),
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
    update(_timeElapsed: number, next: AnimationName) {
      setState(next);
    },
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

        curAction.crossFadeFrom(prevAction, 0.5, true);
        curAction.play();
      } else {
        curAction.play();
      }
    },
  };
}
