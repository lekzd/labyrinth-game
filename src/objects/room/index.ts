import {DynamicObject, RoomConfig, Tiles} from "@/types";
import {Tiles} from "@/config";
import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
  Vector2,
} from "three";
import {createObject, scale, state} from "@/state.ts";
import {systems} from "@/systems";
import {createFloorMaterial} from "./floorMaterial";
import {frandom, random} from "@/utils/random";
import {physicWorld} from "@/cannon";
import {createStone} from "./stone";
import {loads, weaponType} from "@/loader";
import {textureRepeat} from "@/utils/textureRepeat";
import {BufferGeometryUtils} from "three/examples/jsm/Addons.js";
import {something} from "@/utils/something.ts";
import {addObjects} from "@/render.ts";
import {assign} from "@/utils/assign.ts";

export const globalObjects: Record<string, DynamicObject> = {};
window.globalObjects = globalObjects;

export const getObjectState = (id) => state.objects[id] || globalObjects[id];

export class Room {
  private physicBodies: CANNON.Body[] = [];
  protected isOnline: boolean = false;

  readonly mesh: Object3D<Object3DEventMap>;
  floorMesh: Mesh<PlaneGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly config: RoomConfig;
  readonly objects = {};

  constructor(props: RoomConfig) {
    this.config = props;
    this.mesh = initMesh(props, this);

    const trees = {};

    for (let y = 0; y < props.height; y++) {
      for (let x = 0; x < props.width; x++) {
        const tile = props.tiles[x + y * props.width];

        const id = `${props.id}::tile${tile}:${x}:${y}`;

        if (tile === Tiles.Tree) {
          const i = x + y * props.width;
          if (trees[i]) continue;

          trees[x+1 + y * props.width] = true;
          trees[x + (y+1) * props.width] = true;
          trees[(x+1) + (y+1) * props.width] = true;

          const tree = createObject({
            id,
            type: 'Tree',
            position: {
              x: (props.x + frandom(x, x + 1)) * scale,
              y: 0,
              z: (props.y + frandom(y, y + 1)) * scale,
            },
          });

          trees[id] = tree;
          this.objects[id] = tree;
        }
        if (tile === Tiles.Weapon) {
          this.objects[id] = (
            createObject({
              id,
              type: something(Object.values(weaponType)) as weaponType,
              position: {
                x: (props.x + x) * scale,
                z: (props.y + y) * scale,
                y: 4,
              },
            })
          );
        }
        if (tile === Tiles.Campfire) {
          this.objects[id] = (
            createObject({
              id,
              type: 'Campfire',
              position: {
                x: (props.x + x) * scale,
                z: (props.y + y) * scale,
                y: 0,
              },
            })
          );
        }
      }
    }

    assign(globalObjects, this.objects);
    this.objects = addObjects(this.objects);
  }

  offline() {
    if (!this.isOnline) return;

    this.isOnline = false;

    for (const id in this.objects) {
      if (this.objects[id].mesh)
        this.objects[id].mesh.visible = false;

      if (this.objects[id].physicBody)
        physicWorld.removeBody(this.objects[id].physicBody);
    }

    this.mesh.visible = false;
  }

  online() {
    if (this.isOnline) return;

    this.isOnline = true;

    this.mesh.visible = true;

    for (const id in this.objects) {
      if (this.objects[id].mesh)
        this.objects[id].mesh.visible = true;

      if (this.objects[id].physicBody)
        physicWorld.addBody(this.objects[id].physicBody);
    }

    this.mesh.children.forEach((mesh) => {
      mesh.updateMatrixWorld();
    });
  }
}

const initMesh = (props: RoomConfig, root) => {
  const mesh = new Object3D();
  mesh.visible = false;
  mesh.position.set(props.x *scale, 0, props.y *scale);

  const floorMesh = initFloorMesh(props);
  const grassMesh = systems.grassSystem.createRoomMesh(props);

  root.floorMesh = floorMesh

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
    Math.floor(props.width / 2),
    0,
    Math.floor(props.height / 2)
  );

  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  return floorMesh;
}

const createPine = () => {
  const material = new MeshPhongMaterial({
    color: new Color('#715c4c'),
    side: 0,
    shininess: 1,
    map: textureRepeat(loads.texture["Bark_06_basecolor.jpg"]!, 1, 1, 0.4, 2),
    normalMap: textureRepeat(loads.texture["Bark_06_normal.jpg"]!, 1, 1, 0.4, 2),
    normalScale: new Vector2(5, 5)
  });

  const radius = frandom(1, 3)

  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, 160, 5),
    material
  )

  mesh.translateY(40)

  return mesh
}

const createFoliage = () => {
  const height = random(10, 20)
  const colorComponents = [
    Math.floor(63 * frandom(0.5, 1.5)),
    Math.floor(109 * frandom(0.5, 1.0)),
    Math.floor(33 * frandom(0.5, 1.5)),
  ]
  const material = new MeshPhongMaterial({
    color: new Color(`rgb(${colorComponents.join()})`),
    map: loads.texture["foliage.jpg"],
    alphaMap: loads.texture["foliage_mask.jpg"],
    alphaTest: 0.8,
    side: DoubleSide,
  });

  const geometries = [
    (new PlaneGeometry(height, height)).rotateY(Math.PI / 4),
    (new PlaneGeometry(height, height)).rotateY((Math.PI / 4) * 3),
  ]

  const mesh = new Mesh(
    BufferGeometryUtils.mergeGeometries(geometries),
    material
  )

  mesh.translateY(height >> 1)

  return mesh
}

const getForestObject = (type: number) => {
  switch (type) {
    case 1:
      return createPine()
    default:
      return createStone()
  }
}
