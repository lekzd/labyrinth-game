import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import React from "react";
import ReactDOM from "react-dom/client";
import Stats from "@/utils/Stats.ts";
import { Camera } from "./objects/hero/camera.ts";
import {scale, state} from "./state.ts";
import { scene } from "./scene.ts";
import { createGroundBody, physicWorld } from "./cannon.ts";
import { KeyboardCharacterController } from "./objects/hero/controller.ts";
import { currentPlayer } from "./main.ts";
import { systems } from "./systems/index.ts";
import { Room } from "./objects/room/Room.ts";
import { App } from "./ui/App.tsx";
import CannonDebugRenderer from "./cannonDebugRender.ts";
import { getObjectContructorConfig } from "./utils/getObjectContructorConfig.ts";
import {getWorld} from "@/generators/getWorld.ts";
import { DynamicObject } from "./types/DynamicObject.ts";
import { MapObject } from "./types/MapObject.ts";
import { RoomConfig } from "./types/index";
import { Tiles } from "@/config";
import { CentralRoom } from "./objects/room/CentralRoom.ts";
import { MagicTreeRoom } from "./objects/room/MagicTreeRoom.ts";
import {StumpTreeRoom} from "@/objects/room/StumpRoom.ts";
import { MagicMushroomRoom } from "./objects/room/MagicMushroomRoom.ts";
import { Hero } from "./uses/index.ts";

const stats = new Stats();

const ROOM_SIZE = 20;

// Больше этого шага за кадр не симулируем (вкладка была в фоне, отладчик и т.п.)
const MAX_FRAME_TIME = 0.1;

type Subscriber = { update: (time: number) => void; mesh?: THREE.Object3D };

const subscribers = new Set<Subscriber>([
  stats,
  systems.grassSystem,
  systems.inputSystem,
  systems.environmentSystem,
  systems.lightSystem
]);

// Камера и контроллер, привязанные к объекту: уходят вместе с ним
const attachedSubscribers = new Map<string, Subscriber[]>();

const removeObject = (id: string) => {
  const object = systems.objectsSystem.objects[id];

  if (!object) return;

  scene.remove(object.mesh);
  subscribers.delete(object);

  for (const item of attachedSubscribers.get(id) ?? []) subscribers.delete(item);
  attachedSubscribers.delete(id);

  systems.objectsSystem.remove(id);
  object.dispose?.();
};

export const addObjects = (items: Record<string, DynamicObject>) => {
  const res: Record<string, MapObject> = {};

  for (const id in items) {
    const objectConfig = items[id];

    // Delete object
    if (!objectConfig) {
      removeObject(id);
      continue;
    }

    if (id in systems.objectsSystem.objects) {
      systems.objectsSystem.objects[id]?.onStateChange?.(structuredClone(state.objects[id]), items[id])
      continue;
    }

    // После смерти объекта дошло еще обновление стейта, а объект уже удален
    if (!objectConfig.type) {
      continue;
    }

    const controllable = currentPlayer.activeObjectId === id;
    const { Constructor: ObjectConstructor, ...config } = getObjectContructorConfig(objectConfig.type);

    if (!ObjectConstructor) {
      console.error('ObjectConstructor is not constructor', objectConfig.type)
      continue;
    }

    const object = new ObjectConstructor({ ...objectConfig }) as MapObject;
    res[id] = object;

    systems.objectsSystem.add(object, config);
    subscribers.add(object);
    scene.add(object.mesh);

    if (controllable) {
      const { camera } = systems.uiSettingsSystem;
      const attached = [
        Camera({ camera, target: object }),
        KeyboardCharacterController(object)
      ];

      attached.forEach((item) => subscribers.add(item));
      attachedSubscribers.set(id, attached);
    }
  }

  return res;
};


const all: Record<string, Room> = {};

export const render = () => {
  const container = document.getElementById("app")!;
  const root = ReactDOM.createRoot(document.getElementById("react-root")!);
  root.render(React.createElement(App));

  physicWorld.addBody(createGroundBody());

  const { composer, bokehPass, gradePass, renderer, camera, settings } = systems.uiSettingsSystem;

  // Stats
  container.appendChild(stats.dom);

  renderer.setPixelRatio(settings.renderer.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setPixelRatio(settings.renderer.pixelRatio);
  composer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = settings.renderer.shadows;
  renderer.getDrawingBufferSize(gradePass.uniforms.resolution.value);
  container.appendChild(renderer.domElement);
  container.appendChild(systems.uiSettingsSystem.dom);

  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    renderer.getDrawingBufferSize(gradePass.uniforms.resolution.value);
  };

  window.addEventListener("resize", onWindowResize, false);
  container.addEventListener("contextmenu", (e) => e.preventDefault());

  if (settings.game.physics_boxes) {
    const cannonDebugRenderer = new CannonDebugRenderer(scene, physicWorld);
    subscribers.add(cannonDebugRenderer);
  }

  /*
   * Рендерит рекурсивно сцену, пробрасывая в подписчиков (персонаж, камера)
   * тайминг для апдейта сцены
   * */
  let prevTime = -1;

  const renderLoop = () => {
    requestAnimationFrame((t) => {
      if (prevTime === -1) prevTime = t;

      renderLoop();

      const timeElapsedS = Math.min((t - prevTime) * 0.001, MAX_FRAME_TIME);

      prevTime = t;

      const { objects } = systems.objectsSystem;
      const focusVector = objects[currentPlayer.activeObjectId]?.mesh.position ?? new THREE.Vector3();

      systems.environmentSystem.setFocus(focusVector);

      // Updates
      for (const item of subscribers) {
        // Объекты выгруженных комнат не обновляем
        if (item.mesh && !item.mesh.parent) continue;

        item.update(timeElapsedS);
      }

      const pos = focusVector;
      let x = Math.floor(pos.x / scale);
      let z = Math.floor(pos.z / scale);

      x -= x % ROOM_SIZE;
      z -= z % ROOM_SIZE;

      const rooms = roomChunks(x, z, ROOM_SIZE);

      for (const id in all) {
        const room = all[id];

        if (id in rooms) {
          room.online();
          if (room.isPointInside(pos)) {
            room.update(timeElapsedS);
          }
        } else
          room.offline();
      }

      TWEEN.update();

      if (settings.game.physics) {
        systems.objectsSystem.update(timeElapsedS);
      }

      // Рендерим после всех апдейтов, иначе на экране кадр с прошлым состоянием
      bokehPass.uniforms['focus'].value = camera.position.distanceTo(focusVector);
      composer.render();
    });
  };

  renderLoop();
};

const constructors = [
  [Tiles.MagicTree, MagicTreeRoom],
  [Tiles.Stump, StumpTreeRoom],
  [Tiles.Campfire, CentralRoom],
  [Tiles.MagicMushroom, MagicMushroomRoom],
]

export const roomChunks = (x: number, z: number, slice = ROOM_SIZE) => {
  const rooms: Record<string, Room> = {};
  const s = slice;

  const roomsArray = getRoomsRadius({ x, y: 0, z }, slice, 2);

  // Генерация комнаты тяжёлая (400 тайлов шума + объекты), поэтому не больше одной за кадр, ближайшую первой
  const missing = roomsArray
    .filter(({ x, y }) => !(`${x}_${y}` in all))
    .sort((a, b) => Math.hypot(a.x - x, a.y - z) - Math.hypot(b.x - x, b.y - z));

  for (const pos of roomsArray) {
    const { x, y } = pos;
    const id = `${x}_${y}`;

    if (!(id in all)) {
      if (pos !== missing[0]) continue;

      // Если комната еще не распаршена добавляем
      const room: RoomConfig = {
        id,
        width: s,
        height: s,
        actions: [],
        tiles: [],
        x: x,
        y: y,
      }

      // Парсим тили
      for (let y = 0; y < slice; y++) {
        for (let x = 0; x < slice; x++) {
          const index = x + y * slice;
          const tile = getWorld(pos.x + x, pos.y + y);
  
          room.tiles[index] = tile;
        }
      }

      let Constructor = Room;

      for (const [key, render] of constructors)
        if (room.tiles.includes(key as Tiles))
          Constructor = render;

      all[id] = new Constructor(room);
      all[id].init();
    }

    rooms[id] = all[id];
  }

  return rooms;
}

const getRoomsRadius = (base: THREE.Vector3Like, size: number, radius = 1) => {
  const items = [];
  const half = size / 2;

  for (let x = base.x - size * radius; x <= base.x + size * radius; x+=size) {
    for (let y = base.z - size * radius; y <= base.z + size * radius; y+=size) {
      items.push({ x: x - half, y: y - half });
    }
  }

  return items;
}