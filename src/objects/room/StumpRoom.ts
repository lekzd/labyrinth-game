import { DynamicObject, RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { Room } from "./Room";
import { createObject, scale } from "@/state";
import { getDistance } from "@/utils/getDistance";
import { systems } from "@/systems";

export class StumpTreeRoom extends Room {
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
}
