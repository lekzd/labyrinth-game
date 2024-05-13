import * as THREE from "three";
import { frandom } from "../../utils/random";
import { something } from "../../utils/something";

export const createStem = () => {
  const size = frandom(3, 5)
  // Создание стебля гриба
  const stemGeometry = new THREE.CylinderGeometry(
    size / 10,
    size / 10,
    size,
    6,
  );
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x964B00 }); // Коричневый цвет
  const stemMesh = new THREE.Mesh(stemGeometry, stemMaterial);

  // Создание шляпки гриба
  const capGeometry = new THREE.SphereGeometry(
    size / 2,
    3,
    3,
    0,
    Math.PI * 2,
    0,
    1.1
  );
  const colors = [
    0xDC143C, // малиновый
    0x8B4513, // Коричневый
    0x082567, // Сапфировый
    0x55555C, // Слоновая кость
  ]
  const capMaterial = new THREE.MeshStandardMaterial({
    color: something(colors),
  }); // Красный цвет
  const capMesh = new THREE.Mesh(capGeometry, capMaterial);
  capMesh.position.y = size / 3

  // Создание гриба
  const mushroom = new THREE.Group();
  mushroom.add(stemMesh);
  mushroom.add(capMesh);

  return mushroom;
}