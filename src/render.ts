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

const stats = new Stats();

const ROOM_SIZE = 20;

const subscribers: { update: (time: number) => void }[] = [
  stats,
  systems.grassSystem,
  systems.inputSystem,
  systems.environmentSystem
];

export const addObjects = (items: Record<string, DynamicObject>) => {
  const res: Record<string, MapObject> = {};

  for (const id in items) {
    const objectConfig = items[id];

    // Delete object
    if (!objectConfig) {
      scene.remove(systems.objectsSystem.objects[id].mesh);
      systems.objectsSystem.remove(id);
      return;
    }

    if (id in systems.objectsSystem.objects) {
      systems.objectsSystem.objects[id]?.onStateChange?.(structuredClone(state.objects[id]), items[id])
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
    subscribers.push(object);
    scene.add(object.mesh);

    if (controllable) {
      const { camera } = systems.uiSettingsSystem;
      subscribers.push(Camera({ camera, target: object }));
      subscribers.push(KeyboardCharacterController(object));
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

  const { composer, bokehPass, renderer, camera, settings } = systems.uiSettingsSystem;

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
  };

  window.addEventListener("resize", onWindowResize, false);
  container.addEventListener("contextmenu", (e) => e.preventDefault());

  if (settings.game.physics_boxes) {
    const cannonDebugRenderer = new CannonDebugRenderer(scene, physicWorld);
    subscribers.push(cannonDebugRenderer);
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

      const { objects } = systems.objectsSystem;

      const focusVector = objects[currentPlayer.activeObjectId].mesh.position;
      const distance = camera.position.distanceTo(focusVector);
      bokehPass.uniforms['focus'].value = distance;

      composer.render();

      const timeElapsedS = (t - prevTime) * 0.001;

      // Updates
      for (const item of subscribers) {
        item.update(timeElapsedS);
      }

      const pos = focusVector;
      let x = Math.floor(pos.x / scale);
      let z = Math.floor(pos.z / scale);

      x-= x % ROOM_SIZE;
      z-= z % ROOM_SIZE;

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

      prevTime = t;
    });
  };

  renderLoop();
};

const constructors = [
  [Tiles.MagicTree, MagicTreeRoom],
  [Tiles.Stump, StumpTreeRoom],
  [Tiles.Campfire, StumpTreeRoom],
]

export const roomChunks = (x: number, z: number, slice = ROOM_SIZE) => {
  const rooms: Record<string, Room> = {};
  const s = slice;

  const roomsArray = getRoomsRadius({ x, y: 0, z }, slice, 2);

  for (const pos of roomsArray) {
    const { x, y } = pos;
    const id = `${x}_${y}`;

    if (!(id in all)) {
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