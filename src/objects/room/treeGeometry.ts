import * as THREE from "three";
import { loads } from "@/loader";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { createMatrix } from "@/utils/createMatrix";
import { LeavesMatetial } from "@/materials/leaves";
import { CustomTubeGeometry } from "./CustomTubeGeometry";
import { frandom } from "@/utils/random";

const radiusFunction = (from: number, to: number) => (t: number) => {
  return from - (t * (from - to));
};

// Function to create a curved branch that straightens out
function createCurvedBranch(start: THREE.Vector3, mid1: THREE.Vector3, mid2: THREE.Vector3, end: THREE.Vector3, segments: number, fromRadius: number, toRadius: number) {
  const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
  const tubeGeometry = new CustomTubeGeometry(curve, segments, radiusFunction(fromRadius, toRadius), 6, false);

  return tubeGeometry;
}

type BranchData = {
  level: number
  length: number
  matrix: {
    translation: Partial<THREE.Vector3Like>
    rotation: Partial<THREE.Vector3Like>
  }
}

function createBranchGeometry({ level, length, matrix }: BranchData) {
  const start = new THREE.Vector3(0, 0, 0);
  const mid1 = new THREE.Vector3(0, length * 0.3, 2);   // Curved part
  const mid2 = new THREE.Vector3(0, length * 0.7, 0);   // Straightening transition
  const end = new THREE.Vector3(0, length, 0);          // Straight part
  const fromRadius = (level * level) / 5
  const toRadius = ((level-1) * (level-1)) / 5
  const geometry = createCurvedBranch(start, mid1, mid2, end, 6, fromRadius, toRadius);
  
  geometry.applyMatrix4(createMatrix(matrix))

  return geometry
}

function createFoliageGeometry({ length, matrix }: BranchData) {
  const geometry = new THREE.IcosahedronGeometry(length * 0.8, 1);
  
  geometry
    .applyMatrix4(createMatrix(matrix))

  return geometry
}

export function createBranch(level: number, count: number, length: number, parentRotation = { x: 0, y: 0, z: 0 }, parentPosition = { x: 0, y: 0, z: 0 }) {
  const branchGroup: BranchData[] = [];

  // Начальная ветка
  branchGroup.push({
    level,
    length,
    matrix: {
      translation: { ...parentPosition },
      rotation: { ...parentRotation }
    }
  });

  if (level > 0) {
    const angle = Math.PI / 2; // Угол ветвления

    for (let i = 0; i < count; i++) {
      const childRotationY = parentRotation.y + (Math.PI * frandom(0, 2));
      const childRotationZ = parentRotation.z + (angle * frandom(0, 1));
      const childRotation = { x: parentRotation.x, y: childRotationY, z: childRotationZ };

      // Создаем матрицу вращения для родительской ветки
      const parentRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(parentRotation.x, parentRotation.y, parentRotation.z));

      // Вектор направления для дочерних веток
      const direction = new THREE.Vector3(0, length, 0).applyMatrix4(parentRotationMatrix);

      // Позиция конца родительской ветки
      const endPosition = new THREE.Vector3(parentPosition.x, parentPosition.y, parentPosition.z).add(direction);

      const childBranches = createBranch(level - 1, count - 1, length * 0.7, childRotation, { x: endPosition.x, y: endPosition.y, z: endPosition.z });

      childBranches.forEach(branch => {
        branch.matrix = {
          translation: {
            x: branch.matrix.translation.x,
            y: branch.matrix.translation.y,
            z: branch.matrix.translation.z,
          },
          rotation: { ...childRotation }
        };
      });

      branchGroup.push(...childBranches);
    }
  }

  return branchGroup;
}

export const createTree = () => {
  const branches = createBranch(3, 4, 15)
  const branchGeometries = branches.map(createBranchGeometry)
  const woodGeometry = BufferGeometryUtils.mergeGeometries(branchGeometries)
  
  const foliageGeometries = branches.slice(1).map(createFoliageGeometry)
  const croneGeometry = BufferGeometryUtils.mergeGeometries(foliageGeometries)

  const prepareTexture = (texture: THREE.Texture) => {
    const map = texture.clone()
    map.rotation = Math.PI / 2
    map.wrapS = THREE.RepeatWrapping
    map.wrapT = THREE.RepeatWrapping
    map.repeat = new THREE.Vector2(0.5, 2)

    return map
  }

  const material = new THREE.MeshPhongMaterial({
    color: 0x704f37,
    side: 0,
    shininess: 1,
    map: prepareTexture(loads.texture["Bark_06_basecolor.jpg"]!),
    normalMap: prepareTexture(loads.texture["Bark_06_normal.jpg"]!),
    normalScale: new THREE.Vector2(5, 5)
  });

  const mesh = new THREE.Mesh(woodGeometry, material);
  
  const foliage = new THREE.Mesh(croneGeometry, new LeavesMatetial());

  mesh.add(foliage)

  return mesh
}

