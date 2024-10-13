import { DynamicObject, RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { Room } from "./Room";
import { createObject, scale } from "@/state";
import { getWorld } from "@/generators/getWorld";
import { getDistance } from "@/utils/getDistance";
import { Vector3 } from "three";
import { systems } from "@/systems";

export class MagicTreeRoom extends Room {
  getGrass() {}
  getRoomObjects(props: RoomConfig) {
    const objectsToAdd: Record<string, DynamicObject> = {};

    const id = `${props.id}::tile:MagicTree:${props.x}:${props.y}`;

    objectsToAdd[id] = createObject({
      id,
      type: "MagicTree",
      position: this.center,
    });

    return objectsToAdd;
  }

  update(timeDelta: number) {
    Object.entries(this.objectsInside).forEach(([id, object]) => {
      if (
        !["Monk", "Cleric", "Rogue", "Warrior", "Wizard"].includes(object?.type)
      ) {
        return;
      }

      const distance = getDistance(
        this.center,
        object.position
      );

      const model = systems.objectsSystem.objects[object.id]
      if (distance < 50) {
        if (model && model.physicBody) {
          model.physicBody.velocity.y = 10 - (model.physicBody.position.y / 3);
        }
      } else {
        if (model && model.physicBody) {
          model.physicBody.velocity.y = -50;
        }
      }
    });
  }
}
