import * as THREE from "three";
import { frandom, random } from "../../utils/random";
import { loads } from "@/loader";
import { jitterGeometry } from "@/utils/jitterGeometry";

export const createStone = () => {
  const radius = frandom(5, 9)
  const geometry = jitterGeometry(
    new THREE.SphereGeometry(radius, 5, 5),
    radius / 3
  )
  
  geometry.scale(1, 1, 2)
  geometry.rotateX(Math.PI / 2)

  const randomGray = () => {
    const base = random(50, 80)
    return (base << 16) + (base << 8) + base
  }

  // Создание материала и объекта камня
  const material = new THREE.MeshPhongMaterial({
    color: randomGray(),
    map: loads.texture["stone_wall_map.jpg"],
    normalMap: loads.texture["stone_wall_bump.jpg"],
  });
  const stone = new THREE.Mesh(geometry, material);

  // stone.rotation.x = Math.PI / 2

  return stone;
}