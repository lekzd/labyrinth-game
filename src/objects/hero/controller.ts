import * as THREE from "three";
import { state } from "../../state.ts";
import { pickBy } from "../../utils/pickBy.ts";
import { NpcAdditionalAnimations, NpcAnimationStates } from "./NpcAnimationStates.ts";
import { animationType, weaponType } from "../../loader.ts";
import { systems } from "../../systems/index.ts";
import { settings } from "./settings.ts";
import { DynamicObject } from "@/types/DynamicObject.ts";
import { throttle } from "@/utils/throttle.ts";
import { Hero } from "./index.ts";
import { WEAPONS_CONFIG } from "../../config/WEAPONS_CONFIG.ts";

const sendThrottle = throttle(state.setState, 100);
const send = state.setState;

const isEqualParams = (
  prev: DynamicObject,
  { rotation, position, ...other }: DynamicObject
) => {
  for (const key in other) {
    if (other[key] !== prev[key]) return false;
  }

  const points = { rotation, position };

  for (const name in points) {
    for (const key in points[name]) {
      if (Math.floor(points[name][key]) !== Math.floor(prev[name]?.[key])) {
        return false;
      }
    }
  }

  return true;
};

const BasicCharacterControllerInput = (person: Hero) => {
  let timeout = null;

  person.isLocal = true;
  const { speed } = settings[person.props.type];

  const animate = (animationName: string, duration: number) => {
    if (animationName in NpcAdditionalAnimations) {
      state.setState({ objects: { [person.id]: {
        additionsAnimation: animationName,
      } } });
    } else {
      state.setState({ objects: { [person.id]: {
        baseAnimation: animationName,
      } } });
    }

    timeout = setTimeout(() => {
      state.setState({
        objects: { [person.id]: {
          baseAnimation: NpcAnimationStates.idle,
          // null, а не undefined: JSON.stringify выкидывает undefined, и остальные клиенты не узнают о конце атаки
          additionsAnimation: null,
        } }
      });
      timeout = null;
    }, 1000 * duration);
  };

  const jumpingAnimation = person.animationEntity.animations.find((item) =>
    item.name === animationType.jumping
  );

  systems.inputSystem.onKeyDown((input) => {
    if (person.isDead) return;

    if (input.attack) {
      if (timeout) clearTimeout(timeout);

      // без оружия — удар рукой (клип attack)
      const animations: string[] = person.props.weapon
        ? WEAPONS_CONFIG[person.props.weapon].animations
        : [NpcAnimationStates.attack];
      const effect = person.props.weapon
        ? WEAPONS_CONFIG[person.props.weapon].attackEffect
        : null;

      const animation = person.animationEntity.animations.find((item) =>
        animations.includes(item.name)
      );

      if (animation) {
        if (effect) {
          effect.run(person);
        }

        if (person.props.weapon === weaponType.minigun) {
          animate(animation.name, 2);
        } else {
          animate(animation.name, animation.duration / 2);
        }
      }
    }

    if (input.jumping && jumpingAnimation) {
      // getDuration учитывает timeScale миксера, иначе клип успевает начаться заново
      animate(jumpingAnimation.name, person.animationEntity.getDuration(jumpingAnimation.name));
    }
  });

  return {
    update: (timeInSeconds: number) => {
      const { input } = systems.inputSystem;
      const { id, velocity, decceleration, acceleration } = person;
      const prev = state.objects[id];

      if (!prev || person.isDead) return;

      const next: Partial<DynamicObject> = {};

      const acc = acceleration.clone();

      const frameDecceleration = new THREE.Vector3(
        velocity.x * decceleration.x,
        velocity.y * decceleration.y,
        velocity.z * decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z =
        Math.sign(frameDecceleration.z) *
        Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

      velocity.add(frameDecceleration);

      const controlObject = person;

      //set user speed here
      if (input.forward) {
        if (!timeout)
          next.state = next.baseAnimation = input.speed
            ? NpcAnimationStates.run
            : NpcAnimationStates.walk;

        acc.multiplyScalar(input.speed ? speed * 2 : speed);
        velocity.z += acc.z * timeInSeconds;
      } else if (input.backward) {
        if (!timeout)
          next.state = next.baseAnimation = input.speed
            ? NpcAnimationStates.run
            : NpcAnimationStates.walk;

        acc.multiplyScalar(input.speed ? speed * 2 : speed);
        velocity.z -= acc.z * timeInSeconds;
      } else if (
        [NpcAnimationStates.run, NpcAnimationStates.walk].includes(prev.state)
      ) {
        next.state = next.baseAnimation = NpcAnimationStates.idle;
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

      person.setPosition(controlObject.position, 1);

      next.position = pickBy(controlObject.position, ["x", "y", "z"]);
      next.rotation = pickBy(controlObject.rotation, ["x", "y", "z", "w"]);

      if (!isEqualParams(prev, { ...prev, ...next })) {
        (prev.state !== next.state ? send : sendThrottle)({
          objects: { [person.id]: next }
        });
      }
      state.objects[person.id] = { ...prev, ...next };
    }
  };
};

export const KeyboardCharacterController = (person: Hero) =>
  BasicCharacterControllerInput(person);
