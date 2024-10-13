import { DynamicObject, RoomConfig } from "@/types";
import { Room } from "./Room";
import { createObject, getTileId } from "@/state";
import { getDistance } from "@/utils/getDistance";
import { systems } from "@/systems";
import { selectAllPlayerObjects } from "@/utils/stateUtils";
import { Color, Vector3 } from "three";
import * as CANNON from "cannon";
import { Tween } from "@tweenjs/tween.js";
import { getMagicSplashFx } from "@/config/WEAPONS_CONFIG";
import { random } from "@/utils/random";

export class MagicTreeRoom extends Room {
  getGrass() {}
  getRoomObjects(props: RoomConfig) {
    const objectsToAdd: Record<string, DynamicObject> = {};

    const type = "MagicTree";
    const id = getTileId(props, this.center, type);
    const altarPartId = `${id}::AltarPart`;

    objectsToAdd[id] = createObject({
      id,
      type,
      position: this.center,
      onHit: (by) => {
        const apple = systems.objectsSystem.objects[altarPartId];
        const effect = getMagicSplashFx({
          scale: 100,
          color: new Color("rgb(242, 255, 100)"),
        })(new Vector3(this.center.x, this.center.y + 10, this.center.z));

        new Tween({ i: 0 })
          .to({ i: 16 }, 200)
          .onUpdate(({ i }) => {
            effect.update(Math.floor(i));
          })
          .onComplete(() => {
            effect.remove();
          })
          .start();

        if (apple && apple.physicBody) {
          apple.physicBody.applyImpulse(
            new CANNON.Vec3(random(-200, 200), 400, random(-200, 200)),
            new CANNON.Vec3(this.center.x, this.center.y + 10, this.center.z)
          );
        }
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
    selectAllPlayerObjects({ objects: this.objectsInside }).forEach(
      (object) => {
        const distance = getDistance(this.center, object.position);

        const model = systems.objectsSystem.objects[object.id];
        if (distance < 50) {
          if (model && model.physicBody) {
            model.physicBody.velocity.y = 10 - model.physicBody.position.y / 3;
          }
        } else {
          if (model && model.physicBody) {
            model.physicBody.velocity.y = -50;
          }
        }
      }
    );
  }
}
