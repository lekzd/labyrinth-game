import { DynamicObject, RoomConfig } from "@/types";
import { Room } from "./Room";
import { createObject, getTileId } from "@/state";
import { getDistance } from "@/utils/getDistance";
import { systems } from "@/systems";
import { selectAllPlayerObjects } from "@/utils/stateUtils";
import { Color, Vector3 } from "three";
import * as CANNON from "cannon";

export class MagicMushroomRoom extends Room {
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
        
      }
    });

    objectsToAdd[altarPartId] = createObject({
      id: altarPartId,
      type: "AltarPart",
      position: new Vector3(this.center.x, 40, this.center.z)
    });

    return objectsToAdd;
  }

  update(timeDelta: number) {
    
  }
}
