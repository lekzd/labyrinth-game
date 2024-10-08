import * as THREE from "three";
import { frandom } from "../../utils/random";
import { jitterGeometry } from "@/utils/jitterGeometry";
import { StoneMatetial } from "@/materials/stone";

let material: StoneMatetial;

export const createStone = () => {
  const radius = frandom(5, 9);
  const geometry = jitterGeometry(
    new THREE.SphereGeometry(radius, 5, 5),
    radius / 3
  );

  geometry.scale(1, 1, 2);
  geometry.rotateX(Math.PI / 2);

  // Создание материала и объекта камня
  if (!material) {
    material = new StoneMatetial();
  }

  return new THREE.Mesh(geometry, material);
};
