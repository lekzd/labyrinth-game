import * as THREE from 'three';
import { PointOctree, RayPointIntersection } from "sparse-octree";
import { physicWorld } from "../cannon";
import { MapObject } from "../types/MapObject"
import { currentPlayer } from '../main';
import { systems } from '.';
import { scale, state } from '../state';

type ObjectAddConfig = Partial<{
  interactive: boolean
  physical: boolean
}>

export const ObjectsSystem = () => {
  const objects: Record<string, MapObject> = {}
  const physicObjects = new Map<string, MapObject>()
  const interactiveObjects = new Map<string, MapObject>()
  const objectsToInteract: RayPointIntersection<MapObject>[] = []

  // Создаем Octree
  const min = new THREE.Vector3(0, -1, 0);
  const max = new THREE.Vector3(state.colls * scale, 20, state.rows * scale);
  const octree = new PointOctree<MapObject>(min, max, 0, 10000);

  const findActiveObject = (objects: Record<string, MapObject>) => {
    for (const id in objects) {
      if (currentPlayer.activeObjectId === id) {
        return objects[id]
      }
    }

    return null
  }

  return {
    objects,
    objectsToInteract,
    add: (object: MapObject, config: ObjectAddConfig) => {
      objects[object.props.id] = object

      if (config.physical) {
        if (!object.physicBody) {
          throw Error('ObjectsSystem: physical object should have physicBody!')
        }
        physicObjects.set(object.props.id, object)
        physicWorld.addBody(object.physicBody)
      }

      if (config.interactive) {
        interactiveObjects.set(object.props.id, object);
        octree.set(object.mesh.position, object);
      }
    },
    update: (timeElapsedS: number) => {
      const fixedTimeStep = 1.0 / 60.0; // seconds

      physicWorld.step(fixedTimeStep, timeElapsedS);

      physicObjects.forEach(object => {
        if (object.physicBody) {
          object.mesh.position.set(
            object.physicBody.position.x,
            object.physicBody.position.y - (object.physicY ?? 0),
            object.physicBody.position.z
          );
          object.mesh.quaternion.copy(object.physicBody.quaternion);
        }
      })

      const activeObject = findActiveObject(objects)

      if (activeObject) {
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(activeObject.mesh.quaternion);
        const raycaster = new THREE.Raycaster(
          activeObject.mesh.position,
          direction,
          1,
          10,
        );
        raycaster.camera = systems.uiSettingsSystem.camera;
        raycaster.params.Points.threshold = 5

        // const intersects = octree.findPoints(activeObject.mesh.position, 10, true);
        const intersects = octree.raycast(raycaster);

        if (intersects.length) {
          const closest = intersects.find(o => o.data?.interactWith)

          if (closest?.data?.interactWith) {
            closest.data.interactWith()
          }
        }

        objectsToInteract.length = 0
        objectsToInteract.push(...intersects)
      }

    },
  }
}