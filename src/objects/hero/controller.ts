import * as THREE from 'three';
import {state} from "../../state.ts";
import {isEqual} from "../../utils.ts";
import {send} from "../../socket.ts";

const BasicCharacterControllerInput = (person, watcherCallback: ([event, handler]: [string, (event: any) => void]) => void) => {
  const input = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    enter: false,
    speed: false,
    attack: false,
  };

  Object.entries({
    mousedown: (event) => {

    },
    keydown: (event) => {
      input.speed = event.shiftKey;

      switch (event.keyCode) {
        case 87: // w
          input.forward = true;
          break;
        case 38: // arrow up
          input.forward = true;
          break;

        case 65: // a
          input.left = true;
          break;
        case 37: // arrow left
          input.left = true;
          break;

        case 83: // s
          input.backward = true;
          break;
        case 40: // arrow down
          input.backward = true;
          break;

        case 68: // d
          input.right = true;
          break;
        case 39: // arrow right
          input.right = true;
          break;

        case 13: // ENTER
          input.enter = true;
          break;
      }
    },
    keyup: (event) => {
      switch(event.keyCode) {
        case 87: // w
          input.forward = false;
          break;
        case 38: // arrow up
          input.forward = false;
          break;

        case 65: // a
          input.left = false;
          break;
        case 37: // arrow left
          input.left = false;
          break;

        case 83: // s
          input.backward = false;
          break;
        case 40: // arrow down
          input.backward = false;
          break;

        case 68: // d
          input.right = false;
          break;
        case 39: // arrow right
          input.right = false;
          break;

        case 13: // ENTER
          input.enter = false;
          break;
      }
    }
  }).forEach(watcherCallback)

  // TODO listerns for btn events
  
  return {
    ...input,
    update: (timeInSeconds) => {
      const { id, velocity, decceleration, position, acceleration } = person;
      const prev = state.objects[id];
      const next = { ...prev, state: 'idle', }

      const acc = acceleration.clone();

      //set user speed here
      if (input.forward) {
        next.state = input.speed ? 'run' : 'walk';
        acc.multiplyScalar(input.speed ? 6.0 : 3.0);
        velocity.z += acc.z * timeInSeconds;
      }
      if (input.backward) {
        next.state = input.speed ? 'run' : 'walk';
        acc.multiplyScalar(input.speed ? 6.0 : 3.0);
        velocity.z -= acc.z * timeInSeconds;
      }
      if (input.left) {
        next.angle = 4.0 * Math.PI * timeInSeconds * acceleration.y;
      }
      if (input.right) {
        next.angle = 4.0 * -Math.PI * timeInSeconds * acceleration.y;
      }

      const frameDecceleration = new THREE.Vector3(
        velocity.x * decceleration.x,
        velocity.y * decceleration.y,
        velocity.z * decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z));

      velocity.add(frameDecceleration);

      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(person.quaternion);
      forward.normalize();

      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(person.quaternion);
      sideways.normalize();

      sideways.multiplyScalar(velocity.x * timeInSeconds);
      forward.multiplyScalar(velocity.z * timeInSeconds);

      person.position.add(forward);
      person.position.add(sideways);
      next.rotation.x = person.quaternion.x;
      next.rotation.y = person.quaternion.y;
      next.rotation.z = person.quaternion.z;
      next.rotation.w = person.quaternion.w;

      position.copy(person.position);
      next.position = position;

      if (!isEqual(prev, next)) {
        send({ objects: { [person.id]: next } })
      }

      Object.assign(state.objects[person.id], next)
    }
  };
};

export const KeyboardCharacterController = (person) => (
  BasicCharacterControllerInput(
    person,
      args => document.addEventListener(...args, false)
  )
)