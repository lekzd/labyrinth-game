import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import React from "react";
import ReactDOM from "react-dom/client";
import Stats from "@/utils/Stats.ts";
import { Camera } from "./objects/hero/camera.ts";
import { scale, State } from "./state.ts";
import { scene } from "./scene.ts";
import { ObjectType, RoomConfig } from "@/types";
import { createGroundBody, physicWorld } from "./cannon.ts";
import { KeyboardCharacterController } from "./objects/hero/controller.ts";
import { currentPlayer } from "./main.ts";
import { systems } from "./systems/index.ts";
import PolygonClipping from "polygon-clipping";
import { frandom } from "./utils/random.ts";
import { Campfire, Hero, PuzzleHandler, Room, Weapon } from "@/uses";
import { App } from "./ui/App.tsx";
import CannonDebugRenderer from "./cannonDebugRender.ts";

import { loads, modelType } from "./loader.ts";
import { Box } from "cannon";
import { Gate } from "./objects/gate/index.ts";
import { textureRepeat } from "./utils/textureRepeat.ts";

const stats = new Stats();

const subscribers: { update: (time: number) => void }[] = [
  stats,
  systems.grassSystem,
  systems.inputSystem,
  systems.environmentSystem
];
const rooms: Room[] = [];
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
    case "Gate":
      return {
        Constructor: Gate,
        physical: true,
        interactive: false,
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
        Constructor: Hero,
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

  const cannonDebugRenderer = new CannonDebugRenderer(scene, physicWorld);

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
        // cannonDebugRenderer.update()
      }

      prevTime = t;
    });
  };

  renderLoop();
};

function findLineCoordinates(rooms: RoomConfig[], padding: number) {
  const roomPoints = (room: RoomConfig) => {
    const p = padding;
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

  let prevPoint = lineCoordinates[0];

  const points: { x: number; y: number }[] = [];

  lineCoordinates.slice(1).forEach((point) => {
    const prevVector = new THREE.Vector2(prevPoint.x, prevPoint.y);
    const curVector = new THREE.Vector2(point.x, point.y);
    const distance = prevVector.distanceTo(curVector);

    const steps = Math.floor(distance / 1);

    for (let i = 0; i < 1; i += 1 / steps) {
      const newPosition = {
        x: prevVector.x + (curVector.x - prevVector.x) * i,
        y: prevVector.y + (curVector.y - prevVector.y) * i,
      };

      points.push(newPosition);
    }

    prevPoint = point;
  });

  return points;
}

const getWallMesh = (points: { x: number, y: number }[]) => {
  const wallHeight = 3 * scale;

  const vertices = [];
  for (let i = 0; i < points.length; i++) {
    const x = points[i].x * scale;
    const y = points[i].y * scale;

    vertices.push(x, y, frandom(2, 10));  // нижняя часть
    vertices.push(x + frandom(-10, 10), y + frandom(-10, 10), wallHeight);  // верхняя часть
  }

  // Индексы для построения треугольников
  const indices = [];
  const pointCount = points.length;
  for (let i = 0; i < pointCount - 1; i++) {
    // нижний треугольник
    indices.push(i * 2, i * 2 + 1, (i + 1) * 2);
    // верхний треугольник
    indices.push(i * 2 + 1, (i + 1) * 2 + 1, (i + 1) * 2);
  }

  // Создаем BufferGeometry и устанавливаем атрибуты
  const wallGeometry = new THREE.BufferGeometry();
  wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  wallGeometry.setIndex(indices);

  // Вычисляем нормали для корректного отображения освещения
  wallGeometry.computeVertexNormals();

  const wallMesh = new THREE.Mesh(
    wallGeometry,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#181c06'),
      flatShading: true
    })
  )

  wallMesh.position.set(
    0,
    wallHeight,
    0,
  );

  wallMesh.rotation.x = Math.PI / 2;

  return wallMesh
}

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
