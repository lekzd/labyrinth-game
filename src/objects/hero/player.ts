import * as THREE from 'three';
import { modelType, loads } from '../../loader.ts';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createTorch } from '../torch/index.ts';
import { DynamicObject } from '../../types/DynamicObject.ts';
import { state } from '../../state.ts';
import { createPhysicBox, physicWorld } from '../../cannon.ts';

interface Props extends DynamicObject {}

export const Player = ({ id, type, position, rotation }: Props) => {
  const model = loads.model[type];

  if (!model) {
    throw Error(`No model with type "${type}"`)
  }

  const target = clone(model);
  const animations = model.animations.map(animation => animation.clone());

  const decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0)
  const acceleration = new THREE.Vector3(1, 0.25, 50.0)
  const velocity = new THREE.Vector3(0, 0, 0)

  Object.assign(target.position, position)
  Object.assign(target.quaternion, rotation)

  const physicY = 5

  const physicBody = createPhysicBox(
    { x: 2, y: physicY, z: 2 },
    { mass: type === modelType.Monk ? 50 : 25, fixedRotation: true }
  );

  physicBody.position.set(
    position.x,
    position.y + physicY,
    position.z,
  )
  physicBody.quaternion.copy(rotation)

  physicWorld.addBody(physicBody);

  target.scale.multiplyScalar(.05);
  target.updateMatrix();

  target.traverse(o => {
    if (o.isMesh) {
      o.material.map = new THREE.TextureLoader().load(`model/${target.name}_Texture.png`)
      o.material.needsUpdate = true

      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const leftArm = target.getObjectByName('ShoulderL')!
  const leftHand = target.getObjectByName('Fist1L')!
  const torch = createTorch()

  // Прикрепляем факел к руке персонажа
  leftHand.add(torch);

  const mixer = new THREE.AnimationMixer(target);

  for (const clip of animations) {
    const name = clip.name.toLowerCase().replace('characterarmature|', '');

    // if (![NpcAnimationStates.run, NpcAnimationStates.idle, NpcAnimationStates.walk].includes(name))
    //   clip.timeScale = 5.5;

    animations[name] = {
      clip: clip,
      action: mixer.clipAction(clip),
    };
  }
  const stateMachine = CharacterFSM({ animations })
  stateMachine.setState('idle');

  const root = {
    id,
    mesh: target,
    physicBody,
    physicY,
    animations,

    get position() {
      return target.position;
    },
    get acceleration() {
      return acceleration;
    },
    get velocity() {
      return velocity;
    },
    get decceleration() {
      return decceleration;
    },
    get quaternion() {
      return target?.quaternion;
    },
    get rotation() {
      return target?.quaternion;
    },
    setPosition: (position: Partial<THREE.Vector3Like>) => {
      physicBody.position.set(
        position.x || physicBody.position.x,
        position.y ? position.y + physicY : physicBody.position.y,
        position.z || physicBody.position.z,
      )
    },
    setRotation: (angle: number) => {
      const controlObject = target;
      const quaternion = new THREE.Quaternion();
      const axis = new THREE.Vector3(0, 1, 0);
      const npcRotation = controlObject.quaternion.clone();

      quaternion.setFromAxisAngle(axis, angle);
      npcRotation.multiply(quaternion);

      controlObject.quaternion.copy(npcRotation);

      physicBody.quaternion.copy(npcRotation);
    },
    update: (timeInSeconds: number) => {
      if (!stateMachine.currentState) {
        return;
      }
      const obj = state.objects[id];

      stateMachine.update(timeInSeconds, obj.state);

      root.setPosition(obj.position)

      physicBody.quaternion.copy(obj.rotation)
      Object.assign(target.quaternion, obj.rotation)

      if (mixer) mixer.update(timeInSeconds);

      // обновляем позицию руки с факелом,
      // чтобы она не зависела от текущей анимации
      leftArm.rotation.x = Math.PI * -0.3;
    }
  }

  return root;
};

const CharacterFSM = ({ animations }) => {
  let
    states = {},
    currentState = null;

  const setState = (name) => {
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
  }

  return {
    get currentState() {
      return currentState;
    },
    setState,
    update(timeElapsed, next) {
     setState(next)
    },
  }
};

const action = (animations, Name) => ({
  Name,
  Enter(prevState) {
    const curAction = animations[Name]?.action || { play: () => {} };
    if (prevState) {
      const prevAction = animations[prevState.Name]?.action;

      curAction.setEffectiveTimeScale(1.0);
      curAction.enabled = true;

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  },
})