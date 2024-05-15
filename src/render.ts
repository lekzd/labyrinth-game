import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js'
import React from 'react';
import ReactDOM from 'react-dom/client';
import Stats from './utils/Stats.ts';
import { Camera } from "./objects/hero/camera.ts";
import { State, scale } from './state.ts';
import { scene } from './scene.ts';
import { Campfire } from './objects/campfire/index.ts';
import { ObjectType } from './types/ObjectType.ts';
import { Box } from './objects/box/index.ts';
import { createGroundBody, physicWorld } from './cannon.ts';
import { KeyboardCharacterController } from "./objects/hero/controller.ts";
import { currentPlayer } from "./main.ts";
import { Room } from './objects/room/index.ts';
import { MapObject } from './types/MapObject.ts';
import { systems } from './systems/index.ts';
import { RoomConfig } from './generators/types.ts';
import PolygonClipping from 'polygon-clipping';
import { frandom } from './utils/random.ts';
import { Herois } from './objects/hero/Herois.ts';
import { App } from './ui/App.tsx';

const stats = new Stats()

const subscribers: { update: (time: number) => void }[] = [stats, systems.grassSystem, systems.inputSystem]
const objects: Record<string, MapObject> = {}
const rooms: ReturnType<typeof Room>[] = []
const decorationObjects: THREE.Mesh[] = []

const getObjectClass = (type: ObjectType) => {
  switch (type) {
    case 'Campfire':
      return Campfire;
    case 'Box':
      return Box;
    default:
      return Herois;
  }
}

export const addObjects = (items = {}) => {
  for (const id in items) {
    if (id in objects) continue;
    const objectConfig = items[id];

    const controllable = currentPlayer.activeObjectId === id;
    const ObjectConstructor = getObjectClass(objectConfig.type)

    let object;
    if(ObjectConstructor === Herois) {
        object = new ObjectConstructor({ ...objectConfig })
    } else {
        object = ObjectConstructor({ ...objectConfig })
    }

    objects[id] = object
    subscribers.push(object)
    scene.add(object.mesh)

    if (controllable) {
      const { camera } = systems.uiSettingsSystem
      subscribers.push(Camera({ camera, target: object }))
      subscribers.push(KeyboardCharacterController(object))
    }
  }
}

export const render = (state: State) => {
  const container = document.getElementById('app')!;
  const root = ReactDOM.createRoot(document.getElementById('react-root'));
  root.render(React.createElement(App));

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 0.1);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const { renderer, camera, settings } = systems.uiSettingsSystem

  // Stats
  container.appendChild(stats.dom);

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  container.appendChild(systems.uiSettingsSystem.dom);

  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', onWindowResize, false);

  /*
  * Рендерит рекурсивно сцену, пробрасывая в подписчиков (персонаж, камера)
  * тайминг для апдейта сцены
  * */
  let prevTime = null;

  const renderLoop = () => {
    requestAnimationFrame((t) => {
      if (prevTime === null) prevTime = t;

      renderLoop();

      renderer.render(scene, camera);

      const timeElapsedS = (t - prevTime) * 0.001;

      // Updates
      for (const item of subscribers) {
        item.update(timeElapsedS);
      }

      systems.cullingSystem.update(camera, rooms, objects, decorationObjects);
      systems.activeRoomSystem.update(rooms, objects);
      TWEEN.update();

      if (settings.game.physics) {
        const fixedTimeStep = 1.0 / 60.0; // seconds

        physicWorld.step(fixedTimeStep, timeElapsedS);

        for (const id in objects) {
          const object = objects[id];

          if (object.physicBody) {
            object.mesh.position.set(
              object.physicBody.position.x,
              object.physicBody.position.y - (object.physicY ?? 0),
              object.physicBody.position.z,
            )
            object.mesh.quaternion.copy(object.physicBody.quaternion)
          }
        }

      }

      prevTime = t;
    });
  }

  renderLoop();

}

function findLineCoordinates(rooms: RoomConfig[]) {

  const roomPoints = (room: RoomConfig) => {
    const p = 1
    return [
      [room.x - p, room.y - p],
      [room.x + room.width + p, room.y - p],
      [room.x + room.width + p, room.y + room.height + p],
      [room.x - p, room.y + room.height + p],
    ]
  }

  const polygons = rooms.map(room => {
    return [roomPoints(room)]
  })

  const polygon = PolygonClipping.union(...polygons)
  const lineCoordinates = polygon[0][0].map(coords => ({ x: coords[0], y: coords[1] }))

  return lineCoordinates;
}

// TODO: стандартизировать
export const items = {
  roomChunks: (state: State) => {
    state.rooms.forEach(room => {
      const roomObject = Room(room)

      rooms.push(roomObject)

      scene.add(roomObject.mesh);
    })

    const line = findLineCoordinates(state.rooms)
    const shape = new THREE.Shape();

    shape.moveTo(line[0].x * scale, line[0].y * scale);
    line.slice(1).forEach(({ x, y }) => {
      shape.lineTo(x * scale, y * scale);
    })
    shape.closePath()

    const wallHeight = 50

    const geometry = new THREE.ExtrudeGeometry(shape, {
      steps: 2,
      depth: wallHeight,
    });

    const wallMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0x000000, side: 2, fog: true })
    );

    wallMesh.receiveShadow = false

    wallMesh.position.set(
      0,
      wallHeight,
      0,
    )

    wallMesh.rotation.x = Math.PI / 2

    // scene.add(wallMesh);

    let prevPoint = line[0]

    const trees: { x: number, y: number }[] = []

    line.slice(1).forEach(point => {
      const prevVector = new THREE.Vector2(prevPoint.x, prevPoint.y)
      const curVector = new THREE.Vector2(point.x, point.y)
      const distance = prevVector.distanceTo(curVector)

      const steps = Math.floor(distance / 1)

      for (let i = 0; i < 1; i += 1 / steps) {
        const newPosition = {
          x: frandom(-0.3, 0.3) + prevVector.x + (curVector.x - prevVector.x) * i,
          y: frandom(-0.3, 0.3) + prevVector.y + (curVector.y - prevVector.y) * i,
        };

        trees.push(newPosition)
      }

      prevPoint = point
    })

    const matrix = new THREE.Matrix4();
    const height = 40
    const instanceNumber = trees.length
    const threeGeometry = new THREE.CylinderGeometry(1, 10, height, 4, 1);
    const material = new THREE.MeshToonMaterial({ color: 0x143728 })
    const instancedMesh = new THREE.InstancedMesh(threeGeometry, material, instanceNumber);

    trees.forEach((point, instanceIndex) => {
      matrix.setPosition(
        (point.x * scale),
        height * 0.35,
        (point.y * scale),
      )

      instancedMesh.setMatrixAt(instanceIndex, matrix);
    })

    scene.add(instancedMesh);

    physicWorld.addBody(createGroundBody());
  },
}
