import { Vector3 } from "three";
import { DynamicObject, RoomConfig } from "@/types";
import { Room } from "./Room";
import { createObject, getTileId } from "@/state";
import { addObjects } from "@/render";

export class MagicMushroomRoom extends Room {
  mushroomWarriorsIds: string[] = [];
  tickCounter: number = 0;

  getRoomObjects(props: RoomConfig) {
    const objectsToAdd: Record<string, DynamicObject> = {};

    const type = "MagicMushroom";
    const id = getTileId(props, this.center, type);
    const altarPartId = `${id}::AltarPart`;

    objectsToAdd[id] = createObject({
      id,
      type,
      position: this.center,
      onHit: (by) => {
        addObjects({
          [altarPartId]: createObject({
            id: altarPartId,
            type: "AltarPart",
            position: new Vector3(this.center.x, 0, this.center.z)
          })
        });
      }
    });

    return objectsToAdd;
  }

  update(_timeDelta: number) {}
}
