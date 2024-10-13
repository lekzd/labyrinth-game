import { DynamicObject, RoomConfig } from "@/types";
import { Room } from "./Room";
import {createObject, getTileId} from "@/state";

export class StumpTreeRoom extends Room {
  getRoomObjects(props: RoomConfig) {
    const objectsToAdd: Record<string, DynamicObject> = {};

    const type = 'Stump'
    const id = getTileId(props, this.center, type);

    objectsToAdd[id] = createObject({
      id,
      type,
      position: this.center,
    });

    return objectsToAdd;
  }
}
