import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import {Camera} from "./objects/hero/camera.ts";
import {Player} from "./objects/hero/player.ts";
import * as grass from "./grass.ts";
import {State} from './state.ts';
import {scene} from './scene.ts';
import { Campfire } from './objects/campfire/index.ts';
import { ObjectType } from './types/ObjectType.ts';
import { Box } from './objects/box/index.ts';
import { createGroundBody, physicWorld } from './cannon.ts';
import {KeyboardCharacterController} from "./objects/hero/controller.ts";
import {currentPlayer} from "./main.ts";
import {assign} from "./utils/assign.ts";
import { Room } from './objects/room/index.ts';
import { MapObject } from './types/MapObject.ts';
import { systems } from './systems/index.ts';

const scale = 10;
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1.0, 1000.0)
const renderer = new THREE.WebGLRenderer({ antialias: true })
const stats = new Stats()

const subscribers: { update: (time: number) => void }[] = [grass]
const objects: Record<string, MapObject> = {}
const rooms: ReturnType<typeof Room>[] = []

const getObjectClass = (type: ObjectType) => {
  switch (type) {
    case 'Campfire':
      return Campfire;
    case 'Box':
      return Box;
    default:
      return Player;
  }
}

export const addObjects = (items = {}) => {
  for (const id in items) {
    if (id in objects) continue;
    const objectConfig = items[id];

    const controllable = currentPlayer.activeObjectId === id;
    const ObjectConstructor = getObjectClass(objectConfig.type)
    const object = ObjectConstructor({ ...objectConfig })

    objects[id] = object
    subscribers.push(object)
    scene.add(object.mesh)

    if (controllable) {
      subscribers.push(Camera({ camera, target: object }))
      subscribers.push(KeyboardCharacterController(object))
    }
  }
}

export const render = (state: State) => {
  const container = document.getElementById('app')!;

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 0.1);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  // Stats
  container.appendChild(stats.dom);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  /*
  * Рендерит рекурсивно сцену, пробрасывая в подписчиков (персонаж, камера)
  * тайминг для апдейта сцены
  * */
  let prevTime = null;

  const renderLoop = () => {
    requestAnimationFrame((t) => {
      if (prevTime === null) prevTime = t;

      renderLoop();

      stats.update();
      renderer.render(scene, camera);

      const timeElapsedS = (t - prevTime) * 0.001;

      // Updates
      for (const item of subscribers) {
        const upd = item.update;

        upd(timeElapsedS);
      }

      systems.cullingSystem.update(camera, rooms, objects);

      const fixedTimeStep = 1.0 / 60.0; // seconds

      physicWorld.step(fixedTimeStep);

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

      prevTime = t;
    });
  }

  renderLoop();

}

// TODO: стандартизировать
export const items = {
  roomChunks: (state: State) => {
    state.rooms.forEach(room => {
      const roomObject = Room(room)

      rooms.push(roomObject)

      scene.add(roomObject.mesh);
    })

    physicWorld.addBody(createGroundBody());
  },
  ground: (state: State) => {
    const { rows, colls } = state
    const grassMesh = grass.render(state);
    const x = rows * scale >> 1
    const z = colls * scale >> 1

    assign(grassMesh.position, { x, z })
    scene.add(grassMesh);
  },
}
