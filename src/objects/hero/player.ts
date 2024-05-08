import * as THREE from 'three';
import { KeyboardCharacterController, SocketCharacterController } from './controller.ts';
import { modelType, models } from '../../loader.ts';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createTorch } from '../torch/index.ts';
import { DynamicObject } from '../../types/DynamicObject.ts';
import { NpcAnimationStates } from './NpcAnimationStates.ts';
import { state } from '../../state.ts';
import { createPhysicBox, physicWorld } from '../../cannon.ts';

interface Props extends DynamicObject {}

export const Player = ({ id, type, position, rotation }: Props) => {
  const model = models[type];

  if (!model) {
    throw Error(`No model with type "${type}"`)
  }

  const index = state.objects.findIndex(object => object.id === id)
  const activePlayer = state.players.find(player => player.id = state.activePlayerId)
  const controllable = activePlayer?.activeObjectId === id
  const target = clone(model);
  const animations = model.animations.map(animation => animation.clone());

  const decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0)
  const acceleration = new THREE.Vector3(1, 0.25, 50.0)
  const velocity = new THREE.Vector3(0, 0, 0)
  const input = controllable ? KeyboardCharacterController() : SocketCharacterController()

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
    animations[clip.name.replace('CharacterArmature|', '').toLowerCase()] = {
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

    get Position() {
      return target.position;
    },

    get Rotation() {
      return target?.quaternion || new THREE.Quaternion();
    },
    setPosition: (position: Partial<THREE.Vector3Like>) => {
      // Object.assign(target.position, position)
      physicBody.position.set(
        position.x ? position.x : physicBody.position.x,
        position.y ? position.y + physicY : physicBody.position.y,
        position.z ? position.z : physicBody.position.z,
      )
    },
    setRotation: (angle: number) => {
      const controlObject = target;
      const quaternion = new THREE.Quaternion();
      const axis = new THREE.Vector3(0, 1, 0);
      const npcRotation = controlObject.quaternion.clone();

      quaternion.setFromAxisAngle(axis, angle);
      npcRotation.multiply(quaternion);

      // controlObject.quaternion.copy(npcRotation);

      physicBody.quaternion.copy(npcRotation);
    },
    update: (timeInSeconds: number) => {
      if (!stateMachine.currentState) {
        return;
      }

      stateMachine.update(timeInSeconds, input);

      const frameDecceleration = new THREE.Vector3(
        velocity.x * decceleration.x,
        velocity.y * decceleration.y,
        velocity.z * decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z));

      velocity.add(frameDecceleration);

      const controlObject = target;
      const acc = acceleration.clone();

      //set user speed here
      if (input.forward) {
        acc.multiplyScalar(input.speed ? 6.0 : 3.0);
        velocity.z += acc.z * timeInSeconds;
      }
      if (input.backward) {
        acc.multiplyScalar(input.speed ? 6.0 : 3.0);
        velocity.z -= acc.z * timeInSeconds;
      }
      if (input.left) {
        root.setRotation(4.0 * Math.PI * timeInSeconds * acceleration.y);
      }
      if (input.right) {
        root.setRotation(4.0 * -Math.PI * timeInSeconds * acceleration.y);
      }

      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();

      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();

      sideways.multiplyScalar(velocity.x * timeInSeconds);
      forward.multiplyScalar(velocity.z * timeInSeconds);

      controlObject.position.add(forward);
      controlObject.position.add(sideways);

      // Object.assign(physicBody.position, controlObject.position);
      physicBody.position.set(
        controlObject.position.x,
        controlObject.position.y + physicY,
        controlObject.position.z,
      )

      state.objects[index].position.x = controlObject.position.x
      state.objects[index].position.y = controlObject.position.y
      state.objects[index].position.z = controlObject.position.z

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
    currentState = states[name];

    //calling the Enter method from State
    currentState.Enter(prevState);
  }

  states = initStates({ animations, setState });

  return {
    get currentState() {
      return currentState;
    },
    setState,
    update(timeElapsed, input) {
      if (currentState) {
        //calling update method from State
        currentState.update(timeElapsed, input);
      }
    },
  }
};

const initStates = ({ animations, setState }) => ({
  [NpcAnimationStates.walk]: {
    Name: NpcAnimationStates.walk,
    Enter(prevState) {
      const curAction = animations[NpcAnimationStates.walk]?.action || { play: () => {} };
      if (prevState) {
        const prevAction = animations[prevState.Name]?.action;

        curAction.enabled = true;


        curAction.crossFadeFrom(prevAction, 0.5, true);
        curAction.play();
      } else {
        curAction.play();
      }
    },
    update(timeElapsed, input) {
      if (input.forward) {
        return;
      }

      setState(NpcAnimationStates.idle);
    },
  },
  [NpcAnimationStates.walkBack]: {
    Name: NpcAnimationStates.walk,
    Enter(prevState) {
      const curAction = animations[NpcAnimationStates.walk]?.action || { play: () => {} };
      if (prevState) {
        const prevAction = animations[prevState.Name].action;

        curAction.enabled = true;

        curAction.crossFadeFrom(prevAction, 0.5, true);
        curAction.play();
      } else {
        curAction.play();
      }
    },
    update(timeElapsed, input) {
      if (input.backward) {
        return;
      }

      setState(NpcAnimationStates.idle);
    },
  },
  [NpcAnimationStates.run]: {
    Name: NpcAnimationStates.run,
    Enter(prevState) {
      const curAction = animations[NpcAnimationStates.run]?.action || { play: () => {} };
      if (prevState) {
        const prevAction = animations[prevState.Name]?.action;

        curAction.enabled = true;


        curAction.crossFadeFrom(prevAction, 0.5, true);
        curAction.play();
      } else {
        curAction.play();
      }
    },
    update(timeElapsed, input) {
      if (input.forward) {
        return;
      }

      setState(NpcAnimationStates.idle);
    },
  },
  [NpcAnimationStates.idle]: {
    Name: NpcAnimationStates.idle,
    Enter(prevState) {
      const idleAction = animations[NpcAnimationStates.idle]?.action || { play: () => {} };
      if (prevState) {
        const prevAction = animations[prevState.Name]?.action;
        idleAction.time = 0.0;
        idleAction.enabled = true;
        idleAction.setEffectiveTimeScale(1.0);
        idleAction.setEffectiveWeight(1.0);
        idleAction.crossFadeFrom(prevAction, 0.5, true);
        idleAction.play();
      } else {
        idleAction.play();
      }
    },
    update(_, input) {
      if (input.forward) {
        setState(input.speed ? NpcAnimationStates.run : NpcAnimationStates.walk);
      } else if (input.backward) {
        setState(NpcAnimationStates.walkBack);
      }
    }
  }
})