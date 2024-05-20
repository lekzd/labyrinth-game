import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import React from "react";
import ReactDOM from "react-dom/client";
import Stats from "@/utils/Stats.ts";
import { Camera } from "./objects/hero/camera.ts";
import { scale, State } from "./state.ts";
import { scene } from "./scene.ts";
import { ObjectType } from "./types/ObjectType.ts";
import { createGroundBody, physicWorld } from "./cannon.ts";
import { KeyboardCharacterController } from "./objects/hero/controller.ts";
import { currentPlayer } from "./main.ts";
import { systems } from "./systems/index.ts";
import { RoomConfig } from "./generators/types.ts";
import PolygonClipping from "polygon-clipping";
import { frandom } from "./utils/random.ts";
import { Campfire, Herois, PuzzleHandler, Room, Weapon } from "@/uses";
import { App } from "./ui/App.tsx";
import CannonDebugRenderer from "./cannonDebugRender.ts";

import { modelType } from "./loader.ts";
import { Box } from "cannon";

const stats = new Stats();

const subscribers: { update: (time: number) => void }[] = [
  stats,
  systems.grassSystem,
  systems.inputSystem,
];
const rooms: ReturnType<typeof Room>[] = [];
const decorationObjects: THREE.Mesh[] = [];

const getObjectCOntructorConfig = (type: ObjectType) => {
  switch (type) {
    case "Campfire":
      return {
        Constructor: Campfire,
        physical: false,
        interactive: true,
      };
    case "Box":
      return {
        Constructor: Box,
        physical: true,
        interactive: true,
      };
    case "PuzzleHandler":
      return {
        Constructor: PuzzleHandler,
        physical: true,
        interactive: true,
      };
    case modelType.Warrior:
    case modelType.Rogue:
    case modelType.Monk:
    case modelType.Cleric:
    case modelType.Wizard:
      return {
        Constructor: Herois,
        physical: true,
        interactive: true,
      };
      break;
    default:
      return {
        Constructor: Weapon,
        physical: true,
        interactive: true,
      };
  }
};

export const addObjects = (items = {}) => {
  for (const id in items) {
    if (id in systems.objectsSystem.objects) continue;
    const objectConfig = items[id];

    const controllable = currentPlayer.activeObjectId === id;
    const { Constructor: ObjectConstructor, ...config } =
      getObjectCOntructorConfig(objectConfig.type);

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

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 0.1);
  hemiLight.position.set(0, 20, 0);
  hemiLight.updateMatrix();
  hemiLight.matrixAutoUpdate = false;

  scene.add(hemiLight);

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

  const cannonDebugRenderer = new CannonDebugRenderer(scene, physicWorld);

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

      const { objects } = systems.objectsSystem;

      systems.cullingSystem.update(camera, rooms, objects, decorationObjects);
      TWEEN.update();

      if (settings.game.physics) {
        systems.objectsSystem.update(timeElapsedS);
        // cannonDebugRenderer.update()
      }

      prevTime = t;
    });
  };

  renderLoop();
};

function findLineCoordinates(rooms: RoomConfig[]) {
  const roomPoints = (room: RoomConfig) => {
    const p = 1;
    return [
      [room.x - p, room.y - p],
      [room.x + room.width + p, room.y - p],
      [room.x + room.width + p, room.y + room.height + p],
      [room.x - p, room.y + room.height + p],
    ];
  };

  const polygons = rooms.map((room) => {
    return [roomPoints(room)];
  });

  const polygon = PolygonClipping.union(...polygons);
  const lineCoordinates = polygon[0][0].map((coords) => ({
    x: coords[0],
    y: coords[1],
  }));

  return lineCoordinates;
}

// TODO: стандартизировать
export const items = {
  roomChunks: (state: State) => {
    state.rooms.forEach((room) => {
      const roomObject = Room(room);

      rooms.push(roomObject);

      scene.add(roomObject.mesh);
    });

    const line = findLineCoordinates(state.rooms);
    const shape = new THREE.Shape();

    shape.moveTo(line[0].x * scale, line[0].y * scale);
    line.slice(1).forEach(({ x, y }) => {
      shape.lineTo(x * scale, y * scale);
    });
    shape.closePath();

    const wallHeight = 50;

    const geometry = new THREE.ExtrudeGeometry(shape, {
      steps: 2,
      depth: wallHeight,
    });

    const wallMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0x000000, side: 2, fog: true })
    );

    wallMesh.receiveShadow = false;

    wallMesh.position.set(0, wallHeight, 0);

    wallMesh.rotation.x = Math.PI / 2;

    // scene.add(wallMesh);

    let prevPoint = line[0];

    const trees: { x: number; y: number }[] = [];

    line.slice(1).forEach((point) => {
      const prevVector = new THREE.Vector2(prevPoint.x, prevPoint.y);
      const curVector = new THREE.Vector2(point.x, point.y);
      const distance = prevVector.distanceTo(curVector);

      const steps = Math.floor(distance / 1);

      for (let i = 0; i < 1; i += 1 / steps) {
        const newPosition = {
          x:
            frandom(-0.3, 0.3) +
            prevVector.x +
            (curVector.x - prevVector.x) * i,
          y:
            frandom(-0.3, 0.3) +
            prevVector.y +
            (curVector.y - prevVector.y) * i,
        };

        trees.push(newPosition);
      }

      prevPoint = point;
    });

    const matrix = new THREE.Matrix4();
    const height = 40;
    const instanceNumber = trees.length;
    const threeGeometry = new THREE.CylinderGeometry(1, 10, height, 4, 1);
    const material = new THREE.MeshToonMaterial({ color: 0x143728 });
    const instancedMesh = new THREE.InstancedMesh(
      threeGeometry,
      material,
      instanceNumber
    );

    trees.forEach((point, instanceIndex) => {
      matrix.setPosition(point.x * scale, height * 0.35, point.y * scale);

      instancedMesh.setMatrixAt(instanceIndex, matrix);
    });

    instancedMesh.name = "Scene Border Pines";

    scene.add(instancedMesh);

    physicWorld.addBody(createGroundBody());
  },
};
