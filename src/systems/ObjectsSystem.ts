import * as THREE from "three";
import { PointContainer, PointOctree } from "sparse-octree";
import { physicWorld } from "@/cannon";
import { DynamicObject, MapObject } from "@/types";
import { currentPlayer } from "@/main";
import { systems } from ".";
import { state } from "@/state";
import { throttle } from "@/utils/throttle.ts";
import { AABB, Body, Vec3 } from "cannon";
import { HitContactType } from "@/types/HitContactType";
import { getActiveObjectFromState } from "@/utils/stateUtils";

function isPointInsideBody(point: Vec3, body: Body) {
  // Создаем AABB для физического тела
  const aabb = new AABB();

  for (let i = 0; i < body.shapes.length; i++) {
    const shape = body.shapes[i];

    if (shape.calculateWorldAABB) {
      shape.calculateWorldAABB(
        body.position,
        body.quaternion,
        aabb.lowerBound,
        aabb.upperBound
      );

      // Проверяем, находится ли точка внутри AABB
      if (
        point.x > aabb.lowerBound.x &&
        point.x < aabb.upperBound.x &&
        point.y > aabb.lowerBound.y &&
        point.y < aabb.upperBound.y &&
        point.z > aabb.lowerBound.z &&
        point.z < aabb.upperBound.z
      ) {
        return true;
      }
    }
  }

  return false;
}

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
    itemsToHit: PointContainer<MapObject>[]
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
  const interactive: Record<string, MapObject> = {};

  const physicObjects = new Map<string, MapObject>();

  // Создаем Octree
  const min = new THREE.Vector3(-100, -100, -100);
  const max = new THREE.Vector3(100, 100, 100);
  const octree = new PointOctree<MapObject>(min, max, 0, 100);

  const position = {
    previous: { x: 0, y: 0, z: 0 },
    current: { x: 0, y: 0, z: 0 },
  };

  const relativePosition = (point: THREE.Vector3, state: keyof typeof position = 'current') => {
    const vector = point.clone();

    vector.x -= position[state].x;
    vector.y -= position[state].y;
    vector.z -= position[state].z;

    return vector;
  }

  return {
    objects,
    add: (object: MapObject, config: ObjectAddConfig) => {
      objects[object.props.id] = object;

      if (config.physical) {
        if (object.physicBody) {
          physicObjects.set(object.props.id, object);
          physicWorld.addBody(object.physicBody);
        } else {
          console.error("ObjectsSystem: physical object should have physicBody!");
        }
      }

      if (config.interactive) {
        interactive[object.props.id] = object;
      }
    },
    remove: (id) => {
      const object = objects[id];

      if (!object) return;

      if (interactive[id])
        octree.remove(relativePosition(object.mesh.position));

      physicObjects.delete(id);
      physicWorld.remove(object.physicBody);
    },

    checkPointHitColision: (point: THREE.Vector3, fromObjectId: string): HitContactType | null => {
      const cloned = point.clone();
      cloned.y = 0;
      const object = octree.findNearestPoint(cloned, 7, true);
      const activeObject = objects[currentPlayer.activeObjectId];

      if (object && object.data?.props.id !== fromObjectId) {
        hitItems(activeObject.props, [object]);

        return object.data?.props.health ? HitContactType.Body : HitContactType.Other;
      } else {
        const cannonPoint = new Vec3(point.x, point.y, point.z);

        for (const object of physicObjects.values()) {
          if (object.physicBody && isPointInsideBody(cannonPoint, object.physicBody)) {
            if (object.hit) {
              object.hit(activeObject.props, point);
            }
            return HitContactType.Other;
          }
        };
      }

      return null;
    },

    update: (timeElapsedS: number) => {
      const { position: next } = state.select(getActiveObjectFromState) || { position };

      position.previous = position.current;
      position.current = next;

      physicWorld.step(fixedTimeStep, timeElapsedS);

      physicObjects.forEach((object) => {
        if (object.physicBody) {
          const prev = relativePosition(object.mesh.position, 'previous');

          object.mesh.position.set(
            object.physicBody.position.x,
            object.physicBody.position.y - (object.physicY ?? 0),
            object.physicBody.position.z
          );

          object.mesh.quaternion.copy(object.physicBody.quaternion);

          const next = relativePosition(object.mesh.position);

          if (interactive[object.props.id] && object.props.id !== currentPlayer.activeObjectId) {
            // Если рядом добавляем, если нет - удаляем
            if (next.x < 100 && next.y < 100 && next.z < 100) {

              // Двигаем если есть, если нет добавляем
              if (octree.get(prev))
                octree.move(prev, next);
              else
                octree.set(next, object);

            } else {
              if (octree.get(prev))
                octree.remove(prev);
            }
          }
        }
      });

      const activeObject = objects[currentPlayer.activeObjectId];

      if (!activeObject) return;

      const intersects = octree.raycast(
        interactionRaycaster(
          activeObject.mesh.quaternion.clone(),
          new THREE.Vector3(0, 0, 0)
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
                octree.move(
                  relativePosition(data?.mesh.position),
                  relativePosition(data.physicBody.position)
                );
              }
            }
          }
        }
      }
    }
  };
};
