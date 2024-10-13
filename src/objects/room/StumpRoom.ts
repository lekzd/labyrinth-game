import { DynamicObject, RoomConfig } from "@/types";
import { Room } from "./Room";
import { Color, Vector3 } from "three";
import {createObject, getTileId} from "@/state";

export class StumpTreeRoom extends Room {
  getRoomObjects(props: RoomConfig) {
    const objectsToAdd: Record<string, DynamicObject> = {};

    const type = 'Stump'
    const id = getTileId(props, this.center, type);

    const altarPartId = `${id}::AltarPart`;

    objectsToAdd[id] = createObject({
      id,
      type,
      position: this.center,
    });

    objectsToAdd[altarPartId] = createObject({
      id: altarPartId,
      type: "AltarPart",
      position: new Vector3(this.center.x, 40, this.center.z)
    });

    return objectsToAdd;
  }
}
