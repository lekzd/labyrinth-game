import * as THREE from 'three';
import {camera, objects} from "../../render.ts";
import {state} from "../../state.ts";
import {animationType} from "../../loader.ts";
import {NpcBaseAnimations} from "./NpcAnimationStates.ts";

export const checkHit = (attacker, distance = 8) => {
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3(0, 0, 1);
  direction.applyQuaternion(attacker.quaternion);
  raycaster.set(attacker.position, direction);
  raycaster.camera = camera

  const items = Object.values(objects)
    .filter(item => item.target)
    .map(item => item.target)

  const intersects = raycaster.intersectObjects(items, true);
  const changes = { objects: {} };

  for (const intersect of intersects) {
    if (intersect.distance <= distance) {
      // Так как удар попадает по скину, берем парента (таргет героя) и id из userData
      const { id } = intersect.object.parent.userData;
      const health = state.objects[id].health - 5;
      changes.objects[id] = { health };
      if (health <= 0) changes.objects[id].state = NpcBaseAnimations.death;
    }
  }

  delete changes.objects[attacker.id];

  if (Object.keys(changes.objects).length) {
    state.setState(changes)
  }
}