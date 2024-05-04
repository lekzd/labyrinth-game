import * as THREE from 'three';
import { KeyboardCharacterController, SocketCharacterController } from './controller.ts';
import { models } from '../loader.ts';
import { DynamicObject } from '../generators/types.ts';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createTorch } from './createTorch.ts';


interface Props extends DynamicObject {
  controllable: boolean
  scene: any
}

export const Player = ({ controllable, scene, id }: Props) => {
  const gltf = { ...models.modelXbot }
  const target = clone(gltf.scene);
  const animations = gltf.animations.map(animation => animation.clone());
  const leftArm = target.getObjectByName('mixamorigLeftArm')
  const leftHand = target.getObjectByName('mixamorigLeftHand')
  const torch = createTorch()
        
  // Прикрепляем факел к руке персонажа
  leftHand.add(torch);

  const decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0)
  const acceleration = new THREE.Vector3(1, 0.25, 50.0)
  const velocity = new THREE.Vector3(0, 0, 0)
  const position = new THREE.Vector3()
  const input = controllable ? KeyboardCharacterController() : SocketCharacterController()

  scene.add(target);

  target.scale.setScalar(10);

  target.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
    }
  });

  const mixer = new THREE.AnimationMixer(target);

  for (const clip of animations) {
    animations[clip.name] = {
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
    setPosition: (position) => {
      Object.assign(target.position, position)
    },
    update: (timeInSeconds) => {
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
      const _Q = new THREE.Quaternion();
      const _A = new THREE.Vector3();
      const _R = controlObject.quaternion.clone();

      const acc = acceleration.clone();

      //set user speed here
      if (input.forward) {
        acc.multiplyScalar(3.0);
        velocity.z += acc.z * timeInSeconds;
      }
      if (input.backward) {
        acc.multiplyScalar(3.0);
        velocity.z -= acc.z * timeInSeconds;
      }
      if (input.left) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * acceleration.y);
        _R.multiply(_Q);
      }
      if (input.right) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * acceleration.y);
        _R.multiply(_Q);
      }

      controlObject.quaternion.copy(_R);

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
  walk: {
    Name: 'walk',
    Enter(prevState) {
      console.log('animations', animations)
      const curAction = animations['walk'].action;
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
      if (input.forward) {
        return;
      }

      setState('idle');
    },
  },
  walkBack: {
    Name: 'walk',
    Enter(prevState) {
      const curAction = animations['walk'].action;
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

      setState('idle');
    },
  },
  idle: {
    Name: 'idle',
    Enter(prevState) {
      const idleAction = animations['idle'].action;
      if (prevState) {
        const prevAction = animations[prevState.Name].action;
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
        setState('walk');
      } else if (input.backward) {
        setState('walkBack');
      }
    }
  }
})