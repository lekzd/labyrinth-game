import * as THREE from "three";
import { PointOctree, RayPointIntersection } from "sparse-octree";
import { physicWorld } from "@/cannon";
import { DynamicObject, MapObject } from "@/types";
import { currentPlayer } from "@/main";
import { systems } from ".";
import { scale, state } from "@/state";
import { throttle } from "@/utils/throttle.ts";
import { WEAPONS_CONFIG } from "@/config/WEAPONS_CONFIG";

type ObjectAddConfig = Partial<{
  interactive: boolean;
  physical: boolean;
}>;

const intervals = new Map<string, number>();

const tryRunMethod = (
  object: MapObject | null | undefined,
  methodName: "interactWith" | "setFocus" | "hit"
) => {
  if (!object) {
    return;
  }

  const key = `${object.props.id}_${methodName}`;

  if (intervals.has(key)) {
    clearTimeout(intervals.get(key));
    intervals.delete(key);
  } else {
    if (object[methodName]) {
      object[methodName]?.(true);
    }
  }

  const intervalId = setTimeout(() => {
    if (object[methodName]) {
      object[methodName]?.(false);
    }

    intervals.delete(key);
  }, 300);

  intervals.set(key, intervalId);
};

const fixedTimeStep = 1.0 / 60.0; // seconds

const hitItems = throttle(
  (
    activeObject: DynamicObject,
    itemsToHit: RayPointIntersection<MapObject>[]
  ) => {
    for (const itemToHit of itemsToHit) {
      const { data, point } = itemToHit;

      if (data?.hit) {
        data.hit(activeObject, point);
      }
    }
  },
  750
);

const interactionRaycaster = (
  quaternion: THREE.Quaternion,
  position: THREE.Vector3
) => {
  const direction = new THREE.Vector3(0, 0, 1);

  direction.applyQuaternion(quaternion);

  const far = 10;

  const raycaster = new THREE.Raycaster(position, direction, 1, far);
  raycaster.camera = systems.uiSettingsSystem.camera;
  raycaster.params.Points.threshold = 5;

  return raycaster;
};

export const ObjectsSystem = () => {
  const objects: Record<string, MapObject> = {};
  const physicObjects = new Map<string, MapObject>();

  // Создаем Octree
  const min = new THREE.Vector3(0, -1, 0);
  const max = new THREE.Vector3(state.colls * scale, 20, state.rows * scale);
  const octree = new PointOctree<MapObject>(min, max, 0, 10000);

  return {
    objects,
    add: (object: MapObject, config: ObjectAddConfig) => {
      objects[object.props.id] = object;

      if (config.physical) {
        if (!object.physicBody) {
          throw Error("ObjectsSystem: physical object should have physicBody!");
        }

        physicObjects.set(object.props.id, object);
        physicWorld.addBody(object.physicBody);
      }

      if (config.interactive) {
        octree.set(object.mesh.position, object);
      }
    },
    remove: (id) => {
      const object = objects[id];

      if (!object) return;

      octree.remove(object.mesh.position);
      physicObjects.delete(id);
      physicWorld.remove(object.physicBody);
    },

    checkPointHitColision: (point: THREE.Vector3) => {
      const cloned = point.clone();
      cloned.y = 0;
      const object = octree.findNearestPoint(cloned, 5, true);

      if (object) {
        const activeObject = objects[currentPlayer.activeObjectId];

        hitItems(activeObject.props, [object]);

        return true;
      }
    },

    update: (timeElapsedS: number) => {
      physicWorld.step(fixedTimeStep, timeElapsedS);

      physicObjects.forEach((object) => {
        if (object.physicBody) {
          const prevPos = new THREE.Vector3().copy(object.mesh.position);

          object.mesh.position.set(
            object.physicBody.position.x,
            object.physicBody.position.y - (object.physicY ?? 0),
            object.physicBody.position.z
          );

          object.mesh.quaternion.copy(object.physicBody.quaternion);
          octree.move(prevPos, object.mesh.position);
        }
      });

      const activeObject = objects[currentPlayer.activeObjectId];

      if (!activeObject) return;

      const intersects = octree.raycast(
        interactionRaycaster(
          activeObject.mesh.quaternion.clone(),
          activeObject.mesh.position
        )
      );

      const { input } = systems.inputSystem;

      if (intersects.length) {
        // Находим с чем можно взаимодействовать
        const itemToInteract = intersects.find(
          (o) => o.data?.interactWith && o.distance <= 10
        );
        if (itemToInteract) {
          const { data } = itemToInteract;

          tryRunMethod(data, "setFocus");

          if (input.interact) {
            tryRunMethod(data, "interactWith");

            if (data?.mesh.position && data?.physicBody?.position) {
              const distance = data?.mesh.position.distanceTo(
                data?.physicBody?.position
              );

              if (distance > 10) {
                octree.move(data?.mesh.position, data.physicBody.position);
              }
            }
          }
        }
      }
    }
  };
};
