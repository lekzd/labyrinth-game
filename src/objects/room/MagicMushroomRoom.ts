import { DynamicObject, RoomConfig } from "@/types";
import { Room } from "./Room";
import { createObject, getTileId } from "@/state";
import { systems } from "@/systems";
import { Vector3 } from "three";
import { MushroomWarior } from "../mushroomWarior/MushroomWarior";

export class MagicMushroomRoom extends Room {
  mushroomWarriorsIds: string[] = [];
  tickCounter: number = 0;

  getRoomObjects(props: RoomConfig) {
    const objectsToAdd: Record<string, DynamicObject> = {};

    const type = "MagicMushroom";
    const id = getTileId(props, this.center, type);
    const altarPartId = `${id}::AltarPart`;

    const mushroomWarriorsPositions = [
      new Vector3(this.center.x + 20, 0, this.center.z),
      new Vector3(this.center.x - 20, 0, this.center.z),
      new Vector3(this.center.x, 0, this.center.z + 20),
      new Vector3(this.center.x, 0, this.center.z - 20)
    ];

    objectsToAdd[id] = createObject({
      id,
      type,
      position: this.center,
      onHit: (by) => {}
    });

    objectsToAdd[altarPartId] = createObject({
      id: altarPartId,
      type: "AltarPart",
      position: new Vector3(this.center.x, 40, this.center.z)
    });

    mushroomWarriorsPositions.forEach((position, index) => {
      const mushroomWarriorId = `${id}::MushroomWarior:${index}`;

      this.mushroomWarriorsIds.push(mushroomWarriorId);

      objectsToAdd[mushroomWarriorId] = createObject({
        id: mushroomWarriorId,
        type: "MushroomWarior",
        position
      });
    });

    return objectsToAdd;
  }

  update(_timeDelta: number) {
    this.tickCounter++;

    if (this.tickCounter % 100 === 0) {
      this.mushroomWarriorsIds.forEach((mushroomWarriorId) => {
        const mushroomWarrior =
          systems.objectsSystem.objects[mushroomWarriorId] as MushroomWarior;

        mushroomWarrior.setRoom(this);
      });
    }
  }
}
