import { DynamicObject, MapObject, RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { Object3D, Object3DEventMap, Vector3, Vector3Like, Mesh, PlaneGeometry } from "three";
import { createObject, scale, state } from "@/state.ts";
import { frandom, random } from "@/utils/random";
import { physicWorld } from "@/cannon";
import { weaponType } from "@/loader";
import { something } from "@/utils/something.ts";
import { addObjects } from "@/render.ts";
import { assign } from "@/utils/assign.ts";
import { scene } from "@/scene";
import {createFloorMaterial} from "@/objects/room/floorMaterial.ts";
import {systems} from "@/systems";

export const globalObjects: Record<string, DynamicObject> = {};
window.globalObjects = globalObjects;

export const getObjectState = (id: string) =>
  state.objects[id] || globalObjects[id];

export class Room {
  protected isOnline: boolean = false;

  readonly center: Vector3;
  readonly mesh: Object3D<Object3DEventMap>;
  readonly worldPosition: Vector3 = new Vector3();
  readonly objectsInside: Record<string, DynamicObject> = {};
  readonly config: RoomConfig;
  readonly objects: Record<string, MapObject> = {};
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(props: RoomConfig) {
    this.config = props;
    this.getRoomFloorMesh(props);

    this.center = new Vector3(
      (props.x + props.width / 2) * scale,
      0,
      (props.y + props.height / 2) * scale
    );

    const objectsToAdd = this.objectsInside = this.getRoomObjects(props);

    assign(globalObjects, objectsToAdd);
    this.objects = addObjects(objectsToAdd) ?? {};
  }

  private getRoomFloorMesh(props: RoomConfig) {
    const mesh = new Object3D();
    mesh.visible = false;
    mesh.position.set(props.x * scale, 0, props.y * scale);

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

    mesh.add(floorMesh);

    const grass = this.getGrass();

    if (grass) mesh.add(grass);

    mesh.updateMatrixWorld();
    mesh.matrixAutoUpdate = false;

    this.mesh = mesh;
    this.mesh.getWorldPosition(this.worldPosition);
  }

  private getGrass() {
    return systems.grassSystem.createRoomMesh(this.config);
  }

  private getRoomObjects(props: RoomConfig): Record<string, DynamicObject> {
    const objectsToAdd: Record<string, DynamicObject> = {};

    // Хандлеры для разных типов плиток
    const tileHandlers = {
      [Tiles.Tree]: (id: string, x: number, y: number) => {
        if (x % 2 === 0 && y % 2 === 0) {
          objectsToAdd[id] = createObject({
            id,
            type: something(["Tree", "Stone", "Pine", "Foliage", "Foliage"]),
            position: {
              x: (props.x + frandom(x, x + 1)) * scale,
              y: 0,
              z: (props.y + frandom(y, y + 1)) * scale,
            },
          });
        }
      },
      [Tiles.Weapon]: (id: string, x: number, y: number) => {
        objectsToAdd[id] = createObject({
          id,
          type: something(Object.values(weaponType)) as weaponType,
          position: {
            x: (props.x + x) * scale,
            z: (props.y + y) * scale,
            y: 4,
          },
        });
      },
      [Tiles.Floor]: (id: string, x: number, y: number) => {
        if (random(0, 100) === 0) {
          objectsToAdd[id] = createObject({
            id,
            type: "Foliage",
            position: {
              x: (props.x + x) * scale,
              z: (props.y + y) * scale,
              y: 0,
            },
          });
        }
      }
    };

    for (let y = 0; y < props.height; y++) {
      for (let x = 0; x < props.width; x++) {
        const tile = props.tiles[x + y * props.width];
        const id = `${props.id}::tile${tile}:${x}:${y}`;

        if (tileHandlers[tile]) {
          tileHandlers[tile](id, x, y);
        }
      }
    }

    return objectsToAdd;
  }

  private updateObjectsInside() {
    Object.entries(state.objects).forEach(([id, object]) => {
      if (object.position && this.isPointInside(object.position)) {
        this.objectsInside[id] = object;
      } else {
        delete this.objectsInside[id];
      }
    });
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

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
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

    this.updateInterval = setInterval(() => {
      this.updateObjectsInside();
    }, 1000);
  }

  isPointInside(point: Vector3Like) {
    return (
      this.worldPosition.x <= point.x &&
      this.worldPosition.x + this.config.width * scale >= point.x &&
      this.worldPosition.z <= point.z &&
      this.worldPosition.z + this.config.height * scale >= point.z
    );
  }

  update(timeDelta: number) {}
}
