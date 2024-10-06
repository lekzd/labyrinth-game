import { DynamicObject, RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { Room } from "./Room";
import { createObject, scale } from "@/state";
import { getWorld } from "@/generators/getWorld";

const ptInCircle = (px: number, py: number, cx = 0, cy = 0, radius = 20) => {
  const dx = px - cx;
  const dy = py - cy;
  const distanceSquared = dx * dx + dy * dy;

  return distanceSquared <= radius * radius;
};

const getTile = (x: number, y: number, props: RoomConfig) => {
  const center = props.width / 2;

  if (ptInCircle(x, y, center, center, 3)) return Tiles.Road;

  if (ptInCircle(x, y, center, center, 11)) {
    if (
      (x > center - 2 && x < center + 2) ||
      (y > center - 2 && y < center + 2)
    )
      return Tiles.Road;
  }

  return getWorld(x + props.x, y + props.y);
};

export class CentralRoom extends Room {
  constructor(props: RoomConfig) {
    for (let y = 0; y < props.height; y++) {
      for (let x = 0; x < props.width; x++) {
        const index = x + y * props.width;
        const tile = getTile(x, y, props);

        props.tiles[index] = tile;
      }
    }

    super(props);
  }

  getRoomObjects(props: RoomConfig) {
    const objectsToAdd: Record<string, DynamicObject> = {};

    const id = `${props.id}::tile:Campfire:${props.x}:${props.y}`;

    objectsToAdd[id] = createObject({
      id,
      type: "Campfire",
      position: {
        x: (props.x + props.width / 2) * scale,
        z: (props.y + props.height / 2) * scale,
        y: 0
      }
    });

    return objectsToAdd;
  }
}
