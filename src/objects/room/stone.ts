import * as THREE from "three";
import { frandom, random } from "../../utils/random";

export const createStone = () => {
  const radius = frandom(1, 5)
  const jittering = radius / 5
  const geometry = new THREE.SphereGeometry(radius, 10, 10);
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

  const randomGray = () => {
    const base = random(55, 130)
    return (base << 16) + (base << 8) + base
  }

  // Создание материала и объекта камня
  var material = new THREE.MeshPhongMaterial({
    color: randomGray(),
    flatShading:true
  });
  var stone = new THREE.Mesh(geometry, material);

  stone.rotation.x = Math.PI / 2

  return stone;
}