import { RoomConfig } from "@/types";
import { Tiles } from "@/config";
import {
  Group,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
} from "three";
import { scale } from "@/state.ts";
import { systems } from "@/systems";
import { createFloorMaterial } from "./floorMaterial";
import { frandom, random } from "@/utils/random";
import { assign } from "@/utils/assign";
import { createPhysicBox, physicWorld } from "@/cannon";
import { createStone } from "./stone";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { createStem } from "./stem";
import { createTree } from "./treeGeometry";

export class Room {
  private treesPhysicBodies: CANNON.Body[];
  protected isOnline: boolean = false;

  readonly mesh: Object3D<Object3DEventMap>;
  readonly floorMesh: Mesh<PlaneGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly config: RoomConfig;

  constructor(props: RoomConfig) {
    this.config = props;
    this.floorMesh = initFloorMesh(props);
    this.mesh = initMesh(props, this.floorMesh);
    this.treesPhysicBodies = initTreesPhysicBodies(props, this.mesh);
  }

  offline() {
    this.isOnline = false;
    this.treesPhysicBodies.forEach((body) => {
      physicWorld.remove(body);
    });
  }

  online() {
    this.isOnline = true;

    this.mesh.children.forEach((mesh) => {
      mesh.updateMatrixWorld();
    });

    this.treesPhysicBodies.forEach((body) => {
      physicWorld.addBody(body);
    });
  }
  update() {}
}

function initMesh(
  props: RoomConfig,
  floorMesh: Mesh<PlaneGeometry, MeshPhongMaterial, Object3DEventMap>
) {
  const mesh = new Object3D();
  mesh.visible = false;
  mesh.position.set(props.x * scale, 0, props.y * scale);

  const grassMesh = systems.grassSystem.createRoomMesh(props);

  mesh.add(floorMesh);
  mesh.add(grassMesh);
  mesh.updateMatrixWorld();
  mesh.matrixAutoUpdate = false;

  return mesh;
}

function initFloorMesh(props: RoomConfig) {
  const floorMesh = new Mesh(
    new PlaneGeometry(props.width * scale, props.height * scale),
    createFloorMaterial(props)
  );

  floorMesh.position.set(
    Math.floor(props.width / 2) * scale,
    0,
    Math.floor(props.height / 2) * scale
  );

  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  return floorMesh;
}

const treesCache = new Map<number, Mesh>()

const getTreeMemoised = (n: number) => {
  if (!treesCache.get(n)) {
    treesCache.set(n, createTree())
  }

  return treesCache.get(n)!
}

function initTreesPhysicBodies(
  props: RoomConfig,
  mesh: Object3D<Object3DEventMap>
) {
  const treesPhysicBodies: CANNON.Body[] = [];

  for (let i = 0; i < props.tiles.length; i++) {
    const baseX = i % props.width;
    const x = baseX + frandom(-0.2, 0.2);
    const baseY = Math.floor(i / props.width);
    const y = baseY + frandom(-0.2, 0.2);

    if (props.tiles[i] === Tiles.Wall) {
      const isTree = i % 3 === 0
      const cube = isTree ? clone(getTreeMemoised(random(0, 10))) : createStone();

      assign(cube.position, { x: x * scale, z: y * scale });
      if (isTree) {
        cube.rotateY(frandom(0, 180))
      }

      const physicY = 20;
      const physicRadius = 5;
      const physicBody = createPhysicBox(
        { x: physicRadius, y: physicY, z: physicRadius },
        { mass: 0 }
      );

      physicBody.position.set(
        (props.x + baseX) * scale,
        physicY,
        (props.y + baseY) * scale
      );

      treesPhysicBodies.push(physicBody);

      mesh.add(cube);

      if (random(0, 10) === 0) {
        const count = random(1, 5);

        for (let i = 0; i < count; i++) {
          const stem = createStem();
          const radians = ((Math.PI * 2) / count) * i;

          assign(stem.position, {
            x: (x + Math.cos(radians) * 0.5) * scale,
            z: (y + Math.sin(radians) * 0.5) * scale,
          });
          stem.rotation.y = radians;
          stem.rotation.z = Math.PI / 16;
          mesh.add(stem);
        }
      }
    }
  }
  return treesPhysicBodies;
}
