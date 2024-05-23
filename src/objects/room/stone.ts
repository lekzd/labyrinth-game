import * as THREE from "three";
import { frandom, random } from "../../utils/random";
import { loads } from "@/loader";

export const createStone = () => {
  const radius = frandom(3, 8)
  const jittering = radius / 5
  const geometry = new THREE.SphereGeometry(radius, 10, 10);
  const positionAttribute = geometry.getAttribute('position');

  geometry.scale(1, 1, 2)

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

  const randomGray = () => {
    const base = random(75, 130)
    return (base << 16) + (base << 8) + base
  }

  // Создание материала и объекта камня
  var material = new THREE.MeshPhongMaterial({
    color: randomGray(),
    // flatShading:true,
    map: loads.texture["stone_wall_map.jpg"],
    normalMap: loads.texture["stone_wall_bump.jpg"],
  });
  var stone = new THREE.Mesh(geometry, material);

  stone.rotation.x = Math.PI / 2

  return stone;
}