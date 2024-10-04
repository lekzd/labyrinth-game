import * as CANNON from "cannon";
import * as THREE from "three";
import { loads } from "@/loader";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { createMatrix } from "@/utils/createMatrix";
import { LeavesMatetial } from "@/materials/leaves";
import { CustomTubeGeometry } from "./CustomTubeGeometry";
import { frandom, random } from "@/utils/random";
import { pickBy } from "@/utils/pickBy";
import { assign } from "@/utils/assign.ts";
import { DynamicObject } from "@/types";
import { createPhysicBox } from "@/cannon.ts";
import { rotateUvs } from "@/utils/rotateUvs";

const radiusFunction = (from: number, to: number) => (t: number) => {
  return from - t * (from - to);
};

// Function to create a curved branch that straightens out
export function createCurvedBranch(
  start: THREE.Vector3,
  mid1: THREE.Vector3,
  mid2: THREE.Vector3,
  end: THREE.Vector3,
  segments: number,
  fromRadius: number,
  toRadius: number
) {
  const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
  const tubeGeometry = new CustomTubeGeometry(
    curve,
    segments,
    radiusFunction(fromRadius, toRadius),
    6,
    false
  );

  return tubeGeometry;
}

type BranchData = {
  level: number;
  length: number;
  endPosition: THREE.Vector3Like;
  matrix: {
    translation: Partial<THREE.Vector3Like>;
    rotation: Partial<THREE.Vector3Like>;
  };
};

export function createBranchGeometry({ level, length, matrix }: BranchData) {
  const start = new THREE.Vector3(0, 0, 0);
  const mid1 = new THREE.Vector3(0, length * 0.3, 2); // Curved part
  const mid2 = new THREE.Vector3(0, length * 0.7, 0); // Straightening transition
  const end = new THREE.Vector3(0, length, 0); // Straight part
  const fromRadius = (level * level) / 3;
  const toRadius = ((level - 1) * (level - 1)) / 3;
  const geometry = createCurvedBranch(
    start,
    mid1,
    mid2,
    end,
    6,
    fromRadius,
    toRadius
  );

  geometry.applyMatrix4(createMatrix(matrix));

  return geometry;
}

export function createFoliageGeometry({ length, matrix, endPosition }: BranchData) {
  const baseMatrix = createMatrix({ ...matrix, translation: endPosition });

  return [
    new THREE.PlaneGeometry(length, length)
      .rotateY(Math.PI / 4)
      .applyMatrix4(baseMatrix),
    new THREE.PlaneGeometry(length, length)
      .rotateY((Math.PI / 4) * 3)
      .applyMatrix4(baseMatrix)
  ];
}

export function createBranch(
  level: number,
  count: number,
  length: number,
  parentRotation = { x: 0, y: 0, z: 0 },
  parentPosition = { x: 0, y: 0, z: 0 }
) {
  const branchGroup: BranchData[] = [];

  // Создаем матрицу вращения для родительской ветки
  const parentRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(parentRotation.x, parentRotation.y, parentRotation.z)
  );

  // Вектор направления для дочерних веток
  const direction = new THREE.Vector3(0, length, 0).applyMatrix4(
    parentRotationMatrix
  );

  // Позиция конца родительской ветки
  const endPositionVector = new THREE.Vector3(
    parentPosition.x,
    parentPosition.y,
    parentPosition.z
  ).add(direction);
  const endPosition = pickBy(endPositionVector, ["x", "y", "z"]);

  // Начальная ветка
  branchGroup.push({
    level,
    length,
    endPosition,
    matrix: {
      translation: { ...parentPosition },
      rotation: { ...parentRotation }
    }
  });

  if (level > 1) {
    const angle = Math.PI / 2; // Угол ветвления

    for (let i = 0; i < count; i++) {
      const childRotationY = parentRotation.y + Math.PI * -frandom(0, 2);
      const childRotationZ = parentRotation.z + angle * frandom(0, 1);
      const childRotation = {
        x: parentRotation.x,
        y: childRotationY,
        z: childRotationZ
      };

      const childBranches = createBranch(
        level - 1,
        count - 1,
        length * 0.7,
        childRotation,
        endPosition
      );

      branchGroup.push(...childBranches);
    }
  }

  return branchGroup;
}

export const createTree = () => {
  const branches = createBranch(3, 4, random(10, 50));
  const base = rotateUvs(createCurvedBranch(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 3, 0),
    new THREE.Vector3(0, 7, 0),
    new THREE.Vector3(0, 10, 0),
    6,
    7,
    1
  ));
  base.translate(0, 0, 1);
  const branchGeometries = [base, ...branches.map(createBranchGeometry)];

  const woodGeometry = BufferGeometryUtils.mergeGeometries(branchGeometries);

  const foliageGeometries = branches.slice(1).map(createFoliageGeometry).flat();
  const croneGeometry = BufferGeometryUtils.mergeGeometries(foliageGeometries);

  const prepareTexture = (texture: THREE.Texture) => {
    const map = texture.clone();
    map.rotation = Math.PI / 2;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat = new THREE.Vector2(0.5, 2);

    return map;
  };

  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color('#452d1c'),
    side: 0,
    shininess: 1,
    map: prepareTexture(loads.texture["Bark_06_basecolor.jpg"]!),
    normalMap: prepareTexture(loads.texture["Bark_06_normal.jpg"]!),
    normalScale: new THREE.Vector2(5, 5)
  });

  const mesh = new THREE.Mesh(woodGeometry, material);
  const foliage = new THREE.Mesh(croneGeometry, new LeavesMatetial());

  mesh.add(foliage);

  return mesh;
};
const PHYSIC_Y = 4;

const memoRandom = (func: () => THREE.Mesh, numb: number) => {
  const items: THREE.Mesh[] = [];

  return () => {
    if (items.length < numb) {
      const item = func();
      items.push(item);
      return item;
    }

    return items[random(0, numb)];
  };
};

const memoTree = memoRandom(createTree, 20);

export class Tree {
  readonly props: DynamicObject;
  readonly mesh: THREE.Object3D<THREE.Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = PHYSIC_Y;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = memoTree().clone();
    assign(this.mesh.position, props.position);
    this.physicBody = initPhysicBody();

    this.physicBody.position.set(
      props.position.x,
      props.position.y,
      props.position.z
    );
  }
  update(timeDelta: number) {}
}

function initPhysicBody() {
  const physicRadius = 4;
  return createPhysicBox(
    { x: physicRadius, y: 30, z: physicRadius },
    { mass: 0, type: CANNON.Body.STATIC }
  );
}
