import {state} from "../../state.ts";
import {NpcBaseAnimations} from "./NpcAnimationStates.ts";
import { systems } from '../../systems/index.ts';

export const checkHit = (attacker, distance = 8) => {
  const intersects = systems.objectsSystem.objectsToInteract
  const changes = { objects: {} };

  for (const intersect of intersects) {
    if (!intersect.data) {
      continue
    }
    if (intersect.distance <= distance) {
      const { id } = intersect.data?.props;
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