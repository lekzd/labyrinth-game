import { DynamicObject, RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { Room } from "./Room";
import { createObject, scale } from "@/state";
import { getWorld } from "@/generators/getWorld";
import { getDistance } from "@/utils/getDistance";
import { Vector3 } from "three";
import { systems } from "@/systems";

const ptInCircle = (px: number, py: number, cx = 0, cy = 0, radius = 20) => {
  const dx = px - cx;
  const dy = py - cy;
  const distanceSquared = dx * dx + dy * dy;

  return distanceSquared <= radius * radius;
};

const getTile = (x: number, y: number, props: RoomConfig) => {
  const center = props.width / 2;

  if (ptInCircle(x, y, center, center, 11)) {
    return Tiles.Road;
  }

  return getWorld(x + props.x, y + props.y);
};

export class MagicTreeRoom extends Room {
  center: Vector3;
  constructor(props: RoomConfig) {
    for (let y = 0; y < props.height; y++) {
      for (let x = 0; x < props.width; x++) {
        const index = x + y * props.width;
        const tile = getTile(x, y, props);

        props.tiles[index] = tile;
      }
    }

    super(props);

    this.center = new Vector3(
      (props.x + props.width / 2) * scale,
      0,
      (props.y + props.height / 2) * scale
    );
  }

  getRoomObjects(props: RoomConfig) {
    const objectsToAdd: Record<string, DynamicObject> = {};

    const id = `${props.id}::tile:MagicTree:${props.x}:${props.y}`;

    objectsToAdd[id] = createObject({
      id,
      type: "MagicTree",
      position: {
        x: (props.x + props.width / 2) * scale,
        z: (props.y + props.height / 2) * scale,
        y: 0
      }
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
