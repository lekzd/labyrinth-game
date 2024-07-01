import { DynamicObject, RoomConfig } from "@/types";
import { Tiles } from "@/config";
import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import { createObject, scale, state } from "@/state.ts";
import { systems } from "@/systems";
import { createFloorMaterial } from "./floorMaterial";
import { frandom, random } from "@/utils/random";
import { assign } from "@/utils/assign";
import { createPhysicBox, physicWorld } from "@/cannon";
import { createStone } from "./stone";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { createStem } from "./stem";
import { createTree } from "./treeGeometry";
import { loads, weaponType } from "@/loader";
import { textureRepeat } from "@/utils/textureRepeat";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { something } from "@/utils/something";
import { pickBy } from "@/utils/pickBy";

export class Room {
  private physicBodies: CANNON.Body[] = [];
  protected isOnline: boolean = false;

  readonly mesh: Object3D<Object3DEventMap>;
  readonly floorMesh: Mesh<PlaneGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly config: RoomConfig;

  constructor(props: RoomConfig) {
    this.config = props;
    this.floorMesh = initFloorMesh(props);
    this.mesh = initMesh(props, this.floorMesh);
    const roomObjects: DynamicObject[] = [];

    const hasPuzzles = props.tiles.includes(Tiles.PuzzleHandler)
    let hasGate = false

    for (let i = 0; i < props.tiles.length; i++) {
      const baseX = i % props.width;
      const baseY = Math.floor(i / props.width);

      const x = (props.x + (i % props.width)) * scale;
      const z = (props.y + Math.floor(i / props.width)) * scale;

      switch (props.tiles[i]) {
        case Tiles.Wall: {
          this.physicBodies.push(createWallPhysicBody(
            (props.x + baseX) * scale,
            (props.y + baseY) * scale,
          ))
          this.mesh.add(...createWallObjectMeshes(
            baseX, baseY
          ))
          break;
        }
        case Tiles.PuzzleHandler:
          roomObjects.push(
            createObject({
              type: "PuzzleHandler",
              state: random(0, 4),
              position: {
                x,
                y: 4,
                z,
              },
            })
          );
          break;
        case Tiles.Weapon:
          roomObjects.push(
            createObject({
              type: something(Object.values(weaponType)) as weaponType,
              position: {
                x,
                y: 4,
                z,
              },
            })
          );
          break;
      }

      if (!hasGate && hasPuzzles && props.tiles[i] === props.direction) {

        const rotation = new Quaternion();
        const axis = new Vector3(0, 1, 0);

        if (props.direction === Tiles.WestExit) {
          rotation.setFromAxisAngle(axis, -Math.PI / 2);
        }

        if (props.direction === Tiles.EastExit) {
          rotation.setFromAxisAngle(axis, Math.PI / 2);
        }

        if (props.direction === Tiles.SouthExit) {
          rotation.setFromAxisAngle(axis, Math.PI);
        }

        roomObjects.push(
          createObject({
            type: "Gate",
            state: 0,
            position: {
              x,
              y: 4,
              z,
            },
            rotation: pickBy(rotation, ["x", "y", "z", "w"])
          })
        );

        hasGate = true
      }
    }

    if (roomObjects.length) {
      state.setState({
        objects: roomObjects.reduce(
          (acc, item) => ({ ...acc, [item.id]: item }),
          {}
        )
      })

      const puzzleHandlers = roomObjects.filter(object => object.type === 'PuzzleHandler')
      const puzzleIds = puzzleHandlers.map(object => object.id)
      const gateObject = roomObjects.find(object => object.type === 'Gate')

      state.listen(next => {
        if (next.objects) {
          if (!puzzleIds.some(id => Object.keys(next.objects).includes(id))) {
            return
          }

          const solved = puzzleHandlers.every(object => {
            return state.objects[object.id].state % 4 === object.id % 4
          })

          if (gateObject && !!state.objects[gateObject.id].state !== solved) {
            state.setState({
              objects: {
                [gateObject.id]: { state: +solved }
              }
            })
          }
        }
      })
    }
  }

  offline() {
    this.isOnline = false;
    this.physicBodies.forEach((body) => {
      physicWorld.remove(body);
    });
  }

  online() {
    this.isOnline = true;

    this.mesh.children.forEach((mesh) => {
      mesh.updateMatrixWorld();
    });

    this.physicBodies.forEach((body) => {
      physicWorld.addBody(body);
    });
  }
  update() {
    console.log('_debug room update')
  }
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
    treesCache.set(n, createTree().rotateY(frandom(0, 180)))
  }

  return treesCache.get(n)!
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
    new CylinderGeometry(radius, radius, 80, 5),
    material
  )

  mesh.translateY(40)

  return mesh
}

const createFoliage = () => {
  const height = 15
  const material = new MeshPhongMaterial({
    color: new Color('#374310'),
    map: loads.texture["Hedge_001_BaseColor.jpg"],
    alphaMap: loads.texture["foliage.png"],
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

function createWallPhysicBody(x: number, y: number) {
  const physicY = 20;
  const physicRadius = 5;
  const physicBody = createPhysicBox(
    { x: physicRadius, y: physicY, z: physicRadius },
    { mass: 0 }
  );

  physicBody.position.set(
    x,
    physicY,
    y
  );

  return physicBody;
}

function createWallObjectMeshes(baseX: number, baseY: number) {
  const result: Object3D[] = []
  const x = baseX + frandom(-0.2, 0.2);
  const y = baseY + frandom(-0.2, 0.2);

  const objecType = (baseX + baseY) % 3
  const isTree = objecType === 0
  const cube = isTree ? clone(getTreeMemoised(random(0, 10))) : getForestObject(objecType);

  assign(cube.position, { x: x * scale, z: y * scale });

  result.push(cube);

  if (isTree && random(0, 10) === 0) {
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

      result.push(stem);
    }
  }

  if (random(0, 3) === 0) {
    const cube = createFoliage()

    assign(cube.position, {
      x: (x + frandom(-0.5, 0.5)) * scale,
      z: (y + frandom(-0.5, 0.5)) * scale,
    });

    result.push(cube);
  }

  return result
}
