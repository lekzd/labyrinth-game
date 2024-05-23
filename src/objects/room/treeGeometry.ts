import * as THREE from "three";
import {createLeavesMaterial} from "@/materials/leaves";
import { frandom } from "@/utils/random";

// Function to create a curved branch that straightens out
function createCurvedBranch(start, mid1, mid2, end, segments, radius) {
  const jittering = radius / 5
  const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
  const geometry = new THREE.TubeGeometry(curve, segments, radius, 6, false);

  const positionAttribute = geometry.getAttribute('position');

  // Модификация вершин геометрии для создания неровной поверхности
  for (let i = 0; i < positionAttribute.count; i++) {
    // Получаем координаты вершины
    let x = positionAttribute.getX(i);
    let y = positionAttribute.getY(i);
    let z = positionAttribute.getZ(i);

    // Сдвигаем вершину в случайных направлениях
    x += frandom(-jittering, jittering);
    y += frandom(-jittering, jittering);
    z += frandom(-jittering, jittering);

    // Устанавливаем новые координаты вершины
    positionAttribute.setXYZ(i, x, y, z);
  }

  positionAttribute.needsUpdate = true;

  const material = new THREE.MeshPhongMaterial({ color: 0x8B4513, side: 2 });
  return new THREE.Mesh(geometry, material);
}

// Function to create a foliage sphere
function createFoliage(radius, height = 2) {

  const geometry = new THREE.IcosahedronGeometry(radius + 2, 2);
  const foliage = new THREE.Mesh(geometry, createLeavesMaterial());

  // console.log(foliage, foliage.inject) // createLeavesMaterial()

  foliage.scale.y = height; // Увеличиваем высоту кроны

  return foliage;
}

// Create a function to generate the tree
export function createBranch(level, childBranches, length, radius) {
  const branchGroup = new THREE.Group();
  const start = new THREE.Vector3(0, 0, 0);
  const mid1 = new THREE.Vector3(0, length * 0.3, 2);   // Curved part
  const mid2 = new THREE.Vector3(0, length * 0.7, 0);   // Straightening transition
  const end = new THREE.Vector3(0, length, 0);          // Straight part
  const mainBranch = createCurvedBranch(start, mid1, mid2, end, 6, (level * level) / 5);
  mainBranch.rotation.y = Math.PI * frandom(0, 2)
  branchGroup.add(mainBranch);

  if (level > 0) {
    const angle = Math.PI / 4; // Branching angle

    for (let i = 0; i < childBranches; i++) {
      const childBranch = createBranch(level - 1, childBranches - 2,length * 0.7, radius * 0.7);
      childBranch.position.y = length;
      childBranch.rotation.z = angle * (i - 1);
      childBranch.rotation.y = (Math.PI * 2 / childBranches) * i;
      branchGroup.add(childBranch);
    }
  }
  if (level < 2) {
    // Add foliage to the branch
    const foliage = createFoliage(radius * 2);
    foliage.position.y = length;
    branchGroup.add(foliage);
  }

  return branchGroup;
}

