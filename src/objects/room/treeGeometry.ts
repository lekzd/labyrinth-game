import * as THREE from "three";
import {createLeavesMaterial} from "@/materials/leaves";

// Function to create a curved branch that straightens out
function createCurvedBranch(start, mid1, mid2, end, segments) {
  const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
  const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.5, 8, false);
  const material = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
  return new THREE.Mesh(tubeGeometry, material);
}

// Function to create a foliage sphere
function createFoliage(radius, height = 2) {

  const geometry = new THREE.IcosahedronGeometry(radius + 2, 2);
  const material = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 0.1 });
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
  const mainBranch = createCurvedBranch(start, mid1, mid2, end, 10);
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

