import * as THREE from 'three';
import { KeyboardCharacterController, SocketCharacterController } from './controller.ts';
import { models } from '../loader.ts';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createTorch } from '../objects/torch';
import { DynamicObject } from '../types/DynamicObject.ts';
import { NpcAnimationStates } from './NpcAnimationStates.ts';


interface Props extends DynamicObject {
  controllable: boolean
  scene: any
}

export const Player = ({ controllable, scene, id, type }: Props) => {
  const model = models[type];

  const target = clone(model);
  const animations = model.animations.map(animation => animation.clone());

  const decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0)
  const acceleration = new THREE.Vector3(1, 0.25, 50.0)
  const velocity = new THREE.Vector3(0, 0, 0)
  const position = new THREE.Vector3()
  const input = controllable ? KeyboardCharacterController() : SocketCharacterController()

  target.scale.multiplyScalar(.05);
  target.updateMatrix();

  scene.add(target);

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

    get Position() {
      return position;
    },

    get Rotation() {
      return target?.quaternion || new THREE.Quaternion();
    },
    setPosition: (position: Partial<THREE.Vector3Like>) => {
      Object.assign(target.position, position)
    },
    setRotation: (angle: number) => {
      const controlObject = target;
      const quaternion = new THREE.Quaternion();
      const axis = new THREE.Vector3(0, 1, 0);
      const npcRotation = controlObject.quaternion.clone();

      quaternion.setFromAxisAngle(axis, angle);
      npcRotation.multiply(quaternion);

      controlObject.quaternion.copy(npcRotation);
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

      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);

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

      position.copy(controlObject.position);

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