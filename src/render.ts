import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import React from "react";
import ReactDOM from "react-dom/client";
import Stats from "@/utils/Stats.ts";
import { Camera } from "./objects/hero/camera.ts";
import { scale, State } from "./state.ts";
import { scene } from "./scene.ts";
import { createGroundBody, physicWorld } from "./cannon.ts";
import { KeyboardCharacterController } from "./objects/hero/controller.ts";
import { currentPlayer } from "./main.ts";
import { systems } from "./systems/index.ts";
import { frandom } from "./utils/random.ts";
import { Room } from "@/uses";
import { App } from "./ui/App.tsx";
import CannonDebugRenderer from "./cannonDebugRender.ts";

import { loads } from "./loader.ts";
import { textureRepeat } from "./utils/textureRepeat.ts";
import { getObjectContructorConfig } from "./utils/getObjectContructorConfig.ts";
import { getWallMesh } from "./utils/getWallMesh.ts";
import { findLineCoordinates } from "./utils/findLineCoordinates.ts";

const stats = new Stats();

const subscribers: { update: (time: number) => void }[] = [
  stats,
  systems.grassSystem,
  systems.inputSystem,
  systems.environmentSystem
];
const rooms: Room[] = [];
const decorationObjects: THREE.Mesh[] = [];

export const addObjects = (items = {}) => {
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

    systems.objectsSystem.add(object, config);
    subscribers.push(object);
    scene.add(object.mesh);

    if (controllable) {
      const { camera } = systems.uiSettingsSystem;
      subscribers.push(Camera({ camera, target: object }));
      subscribers.push(KeyboardCharacterController(object));
    }
  }
};

export const render = (state: State) => {
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

      systems.cullingSystem.update(camera, rooms, objects, decorationObjects);
      TWEEN.update();

      if (settings.game.physics) {
        systems.objectsSystem.update(timeElapsedS);
      }

      prevTime = t;
    });
  };

  renderLoop();
};

// TODO: стандартизировать
export const items = {
  roomChunks: (state: State) => {
    const roomsArray = Object.values(state.rooms);

    roomsArray.forEach((room) => {
      const roomObject = new Room(room);

      rooms.push(roomObject);

      scene.add(roomObject.mesh);
    });

    systems.grassSystem.updateTerrainTexture()

    const treesLine = findLineCoordinates(roomsArray, 0).map(point => ({
      x: frandom(-0.3, 0.3) + point.x,
      y: frandom(-0.3, 0.3) + point.y,
    }));

    const wallLine = findLineCoordinates(roomsArray, 1).map(point => ({
      x: frandom(-0.3, 0.3) + point.x,
      y: frandom(-0.3, 0.3) + point.y,
    }));;

    const planeWidth = state.colls * scale
    const planeHeight = state.rows * scale

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(planeWidth, planeHeight),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#131209'),
      })
    );

    floorMesh.rotation.x = -Math.PI / 2;

    floorMesh.position.set(
      planeWidth / 2,
      -1,
      planeHeight / 2,
    );

    scene.add(floorMesh);

    scene.add(getWallMesh(wallLine));

    const matrix = new THREE.Matrix4();
    const height = 40;
    const instanceNumber = treesLine.length;
    const threeGeometry = new THREE.BoxGeometry(10, height, 10, 4, 1);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#374310'),
      map: textureRepeat(loads.texture["foliage.jpg"]!, 10, 10, 10, height),
      alphaMap: textureRepeat(loads.texture["foliage_mask.jpg"]!, 10, 10, 10, height),
      alphaTest: 0.8,
      side: THREE.DoubleSide,
    });
    const instancedMesh = new THREE.InstancedMesh(
      threeGeometry,
      material,
      instanceNumber
    );

    treesLine.forEach((point, instanceIndex) => {
      matrix.makeRotationY(Math.PI / 4)
      matrix.setPosition(point.x * scale, height * frandom(0.2, 0.4), point.y * scale);

      instancedMesh.setMatrixAt(instanceIndex, matrix);
    });

    instancedMesh.name = "Scene Border Pines";

    scene.add(instancedMesh);
  },
};
