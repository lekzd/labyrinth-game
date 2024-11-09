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

    const radius = 20;
    const count = 8;

    const mushroomWarriorsPositions = [];

    for (let i = 0; i < count; i++) {
      mushroomWarriorsPositions.push(
        new Vector3(
          this.center.x + Math.cos(i * (Math.PI * 2) / count) * radius,
          0,
          this.center.z + Math.sin(i * (Math.PI * 2) / count) * radius
        )
      );
    }

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

      setTimeout(() => {
        const mushroomWarrior =
          systems.objectsSystem.objects[mushroomWarriorId] as MushroomWarior;

        mushroomWarrior.setRoom(this);
      }, 1000);
    });

    return objectsToAdd;
  }

  update(_timeDelta: number) {

  }
}
