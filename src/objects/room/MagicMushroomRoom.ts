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
        const count = 5
        const objects: Record<string, DynamicObject> = {}
        const radius = 2
        const height = 10
        const angleStep = Math.PI * 2 / count

        for (let i = 0; i < count; i++) {
          const partId = `${altarPartId}::${i}`
          const angle = angleStep * i

          objects[partId] = createObject({
            id: partId,
            type: "AltarPart",
            position: new Vector3(
              this.center.x + Math.cos(angle) * radius,
              height,
              this.center.z + Math.sin(angle) * radius
            )
          })
        }

        addObjects(objects);
      }
    });

    return objectsToAdd;
  }

  update(_timeDelta: number) {}
}
