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
import { Room } from "@/uses";
import { App } from "./ui/App.tsx";
import CannonDebugRenderer from "./cannonDebugRender.ts";
import { getObjectContructorConfig } from "./utils/getObjectContructorConfig.ts";
import {getWorld} from "@/generators/getWorld.ts";

const stats = new Stats();

const subscribers: { update: (time: number) => void }[] = [
  stats,
  systems.grassSystem,
  systems.inputSystem,
  systems.environmentSystem
];

const decorationObjects: THREE.Mesh[] = [];

export const addObjects = (items = {}) => {
  const res = {};

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
    const { Constructor: ObjectConstructor, ...config } =
      getObjectContructorConfig(objectConfig.type);

    const object = new ObjectConstructor({ ...objectConfig });
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


const all = {};

export const render = () => {
  const container = document.getElementById("app")!;
  const root = ReactDOM.createRoot(document.getElementById("react-root")!);
  root.render(React.createElement(App));

  physicWorld.addBody(createGroundBody());

  const { renderer, camera, settings } = systems.uiSettingsSystem;

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

      renderer.render(scene, camera);

      const timeElapsedS = (t - prevTime) * 0.001;

      // Updates
      for (const item of subscribers) {
        item.update(timeElapsedS);
      }

      const { objects } = systems.objectsSystem;

      const rooms = roomChunks(state.objects[currentPlayer.activeObjectId].position);

      for (const id in all) {
        const room = all[id];

        if (id in rooms)
          room.online();
        else
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

export const roomChunks = (pos, slice = 12) => {
  const rooms: Record<string, Room> = {};
  const s = slice;

  let x = Math.floor(pos.x / scale), z = Math.floor(pos.z / scale);

  x-= x % slice;
  z-= z % slice;

  const roomsArray = getRoomsRadius({ x, z }, slice, 3);

  for (const pos of roomsArray) {
    const { x, y } = pos;
    const id = `${x}_${y}`;

    if (!(id in all)) {
      // Если комната еще не распаршена добавляем
      const room = {
        id,
        width: s,
        height: s,
        actions: [],
        tiles: [],
        x: x,
        y: y,
      }

      // Парсим тили
      for (let y = pos.y; y < pos.y + s; y++) {
        for (let x = pos.x; x < pos.x + s; x++) {
          const tile = getWorld(x, y);

          room.tiles.push(tile);
        }
      }

      all[id] = new Room(room);

      scene.add(all[id].mesh);
    }

    rooms[id] = all[id];
  }

  return rooms;
}

const getRoomsRadius = (base, size, radius = 1) => {
  const items = [];

  for (let x = base.x - size * radius; x <= base.x + size * radius; x+=size) {
    for (let y = base.z - size * radius; y <= base.z + size * radius; y+=size) {
      items.push({ x, y });
    }
  }

  return items;
}