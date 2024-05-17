import * as THREE from 'three';
import { RoomConfig } from "../../generators/types";
import { frandom, random } from '../../utils/random';
import { Tiles } from '../../types/Tiles';
import { createPhysicBox, physicWorld } from '../../cannon';
import { assign } from '../../utils/assign';
import { createTree } from './tree';
import { createFloorMaterial } from './floorMaterial';
import { systems } from '../../systems/index.ts';
import { createStone } from './stone.ts';
import { createStem } from './stem.ts';
import { MapObject } from '../../types/MapObject.ts';
import { createPuzzleHandler } from './puzzleHandler.ts';

type InteractiveRoomObject = ReturnType<typeof createPuzzleHandler>

const scale = 10

export const Room = (config: RoomConfig) => {
  let isOnline = true
  const mesh = new THREE.Object3D();

  mesh.visible = false

  mesh.position.set(
    config.x * scale,
    0,
    config.y * scale,
  );

  const grassMesh = systems.grassSystem.createRoomMesh(config);

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(config.width * scale, config.height * scale),
    createFloorMaterial(config),
  );

  floorMesh.position.set(
    Math.floor(config.width / 2) * scale,
    0,
    Math.floor(config.height / 2) * scale,
  );

  floorMesh.rotation.x = - Math.PI / 2;
  floorMesh.receiveShadow = true;

  mesh.add(floorMesh);
  mesh.add(grassMesh);

  mesh.updateMatrixWorld()
  mesh.matrixAutoUpdate = false

  const treesPhysicBodies: CANNON.Body[] = []
  const intractiveObjects: InteractiveRoomObject[] = []

  for (let i = 0; i < config.tiles.length; i++) {
    const baseX = i % config.width
    const x = baseX + frandom(-0.5, 0.5)
    const baseY = Math.floor(i / config.width)
    const y = baseY + frandom(-0.5, 0.5)

    if (config.tiles[i] === Tiles.Wall) {
      const cube = createTree();

      assign(cube.position, { x: x * scale, z: y * scale })

      const physicY = 20
      const physicRadius = 5
      const physicBody = createPhysicBox({ x: physicRadius, y: physicY, z: physicRadius }, { mass: 0 });

      physicBody.position.set(
        (config.x + baseX) * scale,
        physicY,
        (config.y + baseY) * scale,
      )

      treesPhysicBodies.push(physicBody)

      mesh.add(cube)

      if (random(0, 2) === 0) {
        const stone = createStone();
        assign(stone.position, {
          x: (baseX + frandom(-0.5, 0.5)) * scale,
          z: (baseY + frandom(-0.5, 0.5)) * scale,
        })
        mesh.add(stone)
      }

      if (random(0, 10) === 0) {
        const count = random(1, 5)

        for (let i = 0; i < count; i++) {
          const stem = createStem();
          const radians = ((Math.PI * 2) / count) * i;

          assign(stem.position, {
            x: (x + Math.cos(radians) * 0.5) * scale,
            z: (y + Math.sin(radians) * 0.5) * scale,
          })
          stem.rotation.y = radians
          stem.rotation.z = Math.PI / 16
          mesh.add(stem)
        }

      }
    }

    if (config.tiles[i] === Tiles.PuzzleHandler) {
      const x = i % config.width
      const y = Math.floor(i / config.width)

      const puzzleHandler = createPuzzleHandler()

      assign(puzzleHandler.mesh.position, { x: x * scale, y: 4, z: y * scale })

      const physicY = 4
      const physicRadius = 5
      const physicBody = createPhysicBox({ x: physicRadius, y: physicY, z: physicRadius }, { mass: 0 });

      physicBody.position.set(
        (config.x + x) * scale,
        physicY,
        (config.y + y) * scale,
      )

      treesPhysicBodies.push(physicBody)
      intractiveObjects.push(puzzleHandler)

      mesh.add(puzzleHandler.mesh)
    }
  }

  return {
    config,
    offline: () => {
      isOnline = false

      treesPhysicBodies.forEach(body => {
        physicWorld.remove(body)
      })
    },
    online: () => {
      isOnline = true

      mesh.children.forEach(mesh => {
        mesh.updateMatrixWorld()
      })

      treesPhysicBodies.forEach(body => {
        physicWorld.addBody(body)
      })

    },
    update: (objectsInside: MapObject[]) => {
      const { activeObjectRef: { current: activeObject } } = systems.activeRoomSystem

      if (!activeObject) {
        return
      }

      const { camera } = systems.uiSettingsSystem

      const getDistance = (mesh: THREE.Object3D) => {
        const worldVector = new THREE.Vector3();
        mesh.getWorldPosition(worldVector);
        return worldVector.distanceTo(activeObject.mesh.position)
      }

      const nearestObjects = intractiveObjects
        .filter(object => {
          return getDistance(object.mesh) < 2 * scale
        })

        const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      // Получить позицию камеры и объекта
      const cameraPosition = new THREE.Vector3();
      camera.getWorldPosition(cameraPosition);

      const objectsDotProducts: [InteractiveRoomObject, number][] = []
      const fieldOfView = Math.cos(Math.PI / 4);

      nearestObjects.forEach(object => {
        const objectPosition = new THREE.Vector3();
        object.mesh.getWorldPosition(objectPosition);

        // Вычислить вектор направления к объекту
        const directionToObject = new THREE.Vector3();
        directionToObject.subVectors(objectPosition, cameraPosition).normalize();
        const dotProduct = cameraDirection.dot(directionToObject)

        if (dotProduct > fieldOfView) {
          objectsDotProducts.push([object, fieldOfView - dotProduct])
        }
      })

      if (!objectsDotProducts.length) {
        return
      }

      const [[object]] = objectsDotProducts.sort((a, b) => a[1] - b[1])

      if (object) {
        object.interactWith(activeObject)
      }
    },
    mesh,
    floorMesh
  }
}