import { DynamicObject, MapObject, RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { Mesh, Object3D, Object3DEventMap, PlaneGeometry } from "three";
import { createObject, scale, state } from "@/state.ts";
import { systems } from "@/systems";
import { createFloorMaterial } from "./floorMaterial";
import { frandom, random } from "@/utils/random";
import { physicWorld } from "@/cannon";
import { weaponType } from "@/loader";
import { something } from "@/utils/something.ts";
import { addObjects } from "@/render.ts";
import { assign } from "@/utils/assign.ts";
import { scene } from "@/scene";

export const globalObjects: Record<string, DynamicObject> = {};
window.globalObjects = globalObjects;

export const getObjectState = (id: string) =>
  state.objects[id] || globalObjects[id];

export class Room {
  protected isOnline: boolean = false;

  readonly mesh: Object3D<Object3DEventMap>;
  readonly config: RoomConfig;
  readonly objects: Record<string, MapObject> = {};

  constructor(props: RoomConfig) {
    this.config = props;
    this.mesh = initMesh(props);

    const objectsToAdd: Record<string, DynamicObject> = {};
    const trees: Record<number, boolean> = {};

    for (let y = 0; y < props.height; y++) {
      for (let x = 0; x < props.width; x++) {
        const tile = props.tiles[x + y * props.width];

        const id = `${props.id}::tile${tile}:${x}:${y}`;

        if (tile === Tiles.Tree) {
          const i = x + y * props.width;
          if (trees[i]) continue;

          trees[x + 1 + y * props.width] = true;
          trees[x + (y + 1) * props.width] = true;
          trees[x + 1 + (y + 1) * props.width] = true;

          const tree = createObject({
            id,
            type: something([
              "Tree",
              "Tree",
              "Tree",
              "Tree",
              "Stone",
              "Pine",
              "Foliage",
              "Foliage"
            ]),
            position: {
              x: (props.x + frandom(x, x + 1)) * scale,
              y: 0,
              z: (props.y + frandom(y, y + 1)) * scale
            }
          });

          objectsToAdd[id] = tree;
        }
        if (tile === Tiles.Weapon) {
          objectsToAdd[id] = createObject({
            id,
            type: something(Object.values(weaponType)) as weaponType,
            position: {
              x: (props.x + x) * scale,
              z: (props.y + y) * scale,
              y: 4
            }
          });
        }
        if (tile === Tiles.Campfire) {
          objectsToAdd[id] = createObject({
            id,
            type: "Campfire",
            position: {
              x: (props.x + x) * scale,
              z: (props.y + y) * scale,
              y: 0
            }
          });
        }
        if (tile === Tiles.Floor) {
          if (random(0, 100) === 0) {
            objectsToAdd[id] = createObject({
              id,
              type: "Foliage",
              position: {
                x: (props.x + x) * scale,
                z: (props.y + y) * scale,
                y: 0
              }
            });
          }
        }
        if (tile === Tiles.MagicTree) {
          objectsToAdd[id] = createObject({
            id,
            type: 'MagicTree',
            position: {
              x: (props.x + x) * scale,
              z: (props.y + y) * scale,
              y: 4
            }
          });

          console.log('_debug', objectsToAdd[id]);
        }
      }
    }

    assign(globalObjects, objectsToAdd);
    this.objects = addObjects(objectsToAdd) ?? {};
  }

  offline() {
    if (!this.isOnline) return;

    this.isOnline = false;

    scene.remove(this.mesh);

    for (const id in this.objects) {
      const { mesh, physicBody } = this.objects[id];

      if (mesh) {
        mesh.visible = false;
        scene.remove(mesh);
      }

      if (physicBody) {
        physicWorld.remove(physicBody);
      }
    }

    this.mesh.visible = false;
  }

  online() {
    if (this.isOnline) return;

    this.isOnline = true;

    scene.add(this.mesh);

    this.mesh.visible = true;

    for (const id in this.objects) {
      const { mesh, physicBody } = this.objects[id];

      if (mesh) {
        mesh.visible = true;
        scene.add(mesh);
      }

      if (physicBody) physicWorld.addBody(physicBody);
    }

    this.mesh.children.forEach((mesh) => {
      mesh.updateMatrixWorld();
    });
  }
}

const initMesh = (props: RoomConfig) => {
  const mesh = new Object3D();
  mesh.visible = false;
  mesh.position.set(props.x * scale, 0, props.y * scale);

  const floorMesh = initFloorMesh(props);
  const grassMesh = systems.grassSystem.createRoomMesh(props);

  mesh.add(floorMesh);
  mesh.add(grassMesh);
  mesh.updateMatrixWorld();
  mesh.matrixAutoUpdate = false;

  return mesh;
};

function initFloorMesh(props: RoomConfig) {
  const floorMesh = new Mesh(
    new PlaneGeometry(props.width * scale, props.height * scale),
    createFloorMaterial(props)
  );

  floorMesh.position.set(
    Math.floor(props.width / 2),
    0,
    Math.floor(props.height / 2)
  );

  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  return floorMesh;
}
