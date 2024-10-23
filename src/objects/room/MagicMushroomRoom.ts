import { DynamicObject, RoomConfig } from "@/types";
import { Room } from "./Room";
import { createObject, getTileId } from "@/state";
import { getDistance } from "@/utils/getDistance";
import { systems } from "@/systems";
import { selectAllPlayerObjects } from "@/utils/stateUtils";
import { Vector3, Vector3Like } from "three";
import * as CANNON from "cannon";
import { get2DAngleBetweenPoints } from "@/utils/getAngleBetweenPoints";

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
      const [object] = selectAllPlayerObjects({
        objects: this.objectsInside
      }).sort(
        (a, b) =>
          getDistance(a.position, this.center) -
          getDistance(b.position, this.center)
      );

      this.mushroomWarriorsIds.forEach((mushroomWarriorId) => {
        const mushroomWarrior =
          systems.objectsSystem.objects[mushroomWarriorId];
        const distanceToPlayer = object
          ? getDistance(mushroomWarrior.mesh.position, object.position)
          : 10000;
        const distanceToCenter = getDistance(
          mushroomWarrior.mesh.position,
          this.center
        );

        const impluse = 400;

        const goToTarget = (target: Vector3Like) => {
          const objectPosition = mushroomWarrior.mesh.position;
          const direction = new CANNON.Vec3(
            target.x - objectPosition.x,
            target.y - objectPosition.y,
            target.z - objectPosition.z
          );

          // Нормализуем вектор, чтобы его длина была равна 1
          direction.normalize();

          // Умножаем нормализованный вектор на силу импульса
          const impulseVector = new CANNON.Vec3(
            direction.x * impluse * 2,
            impluse,
            direction.z * impluse * 2
          );

          const angleToTarget = get2DAngleBetweenPoints(
            mushroomWarrior.mesh.position,
            target
          );

          mushroomWarrior.physicBody?.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            angleToTarget
          );

          mushroomWarrior.physicBody?.applyLocalImpulse(
            impulseVector,
            mushroomWarrior.physicBody.position
          );
        };

        const goToCenter = () => {
          goToTarget(this.center);
        };

        const goToPlayer = () => {
          goToTarget(object.position);
        };

        if (distanceToCenter < 100) {
          // грибок в грибнице, может атаковать

          if (distanceToPlayer < 50) {
            goToPlayer();
          } else {
            goToCenter();
          }
        } else {
          // грибок отошел от грибницы, идет обратно

          if (distanceToCenter > 10) {
            goToCenter();
          }
        }
      });
    }
  }
}
