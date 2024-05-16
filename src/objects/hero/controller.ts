import * as THREE from 'three';
import { state } from "../../state.ts";
import { pickBy } from "../../utils/pickBy.ts";
import { NpcAnimationStates } from "./NpcAnimationStates.ts";
import { animationType } from "../../loader.ts";
import { systems } from '../../systems/index.ts';
import {checkHit} from "./hit.ts";

const sendThrottle = state.setState

const isEqualParams = (prev, { rotation, position, ...other }) => {
  for (const key in other) {
    if (other[key] !== prev[key])
      return false
  }

  const points = { rotation, position }

  for (const name in points) {
    for (const key in points[name]) {
      if (Math.floor(points[name][key]) !== Math.floor(prev[name][key])) {
        return false
      }
    }
  }

  return true
}

const BasicCharacterControllerInput = (person) => {
  let timeout = null

  const animate = (anim) => {
    state.setState({ objects: { [person.id]: { state: anim } } })

    timeout = setTimeout(() => {
      state.setState({ objects: { [person.id]: { state: NpcAnimationStates.idle } } })
      timeout = null;
    }, 1000)
  }

  systems.inputSystem.onKeyDown(input => {
    if (input.attack) {
      if (timeout) clearTimeout(timeout);
  
      for (const anim of [NpcAnimationStates.attack, NpcAnimationStates.attack2, NpcAnimationStates.sword_attackfast, NpcAnimationStates.dagger_attack2, NpcAnimationStates.spell1]) {
        if (anim in person.animations) {
          animate(anim)
          setTimeout(() => checkHit(person), 500);
          break;
        }
      }
    }

    if (input.jumping) {
      animate(animationType.jumping)
    }
  })

  return {
    update: (timeInSeconds) => {
      const { input } = systems.inputSystem
      const { id, velocity, decceleration, position, physicY, physicBody, acceleration } = person;
      const prev = state.objects[id];
      const next = { ...prev }

      const acc = acceleration.clone();

      const frameDecceleration = new THREE.Vector3(
        velocity.x * decceleration.x,
        velocity.y * decceleration.y,
        velocity.z * decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z));

      velocity.add(frameDecceleration);

      const controlObject = person;

      //set user speed here
      if (input.forward) {
        if (!timeout)
          next.state = input.speed ? NpcAnimationStates.run : NpcAnimationStates.walk;

        acc.multiplyScalar(input.speed ? 6.0 : 3);
        velocity.z += acc.z * timeInSeconds;
      } else if (input.backward) {
        if (!timeout)
          next.state = input.speed ? NpcAnimationStates.run : NpcAnimationStates.walk;

        acc.multiplyScalar(input.speed ? 6.0 : 3);
        velocity.z -= acc.z * timeInSeconds;
      } else if ([NpcAnimationStates.run, NpcAnimationStates.walk].includes(next.state)) {
        next.state = NpcAnimationStates.idle;
      }

      if (input.left) {
        person.setRotation(4.0 * Math.PI * timeInSeconds * acceleration.y);
      }
      if (input.right) {
        person.setRotation(4.0 * -Math.PI * timeInSeconds * acceleration.y);
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

      // assign(physicBody.position, controlObject.position);
      person.setPosition(controlObject.position)

      next.position = pickBy(controlObject.position, ['x', 'y', 'z']);
      next.rotation = pickBy(controlObject.rotation, ['x', 'y', 'z', 'w']);

      if (!isEqualParams(prev, next)) {
        sendThrottle({ objects: { [person.id]: next } })
      }
      state.objects[person.id] = next;
    }
  };
};

export const KeyboardCharacterController = (person) => (
  BasicCharacterControllerInput(person)
)