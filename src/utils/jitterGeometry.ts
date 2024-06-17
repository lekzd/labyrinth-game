import { BufferGeometry } from "three";
import { frandom } from "./random";

export const jitterGeometry = (geometry: BufferGeometry, amount: number): BufferGeometry => {
  const positionAttribute = geometry.getAttribute('position');

  // Модификация вершин геометрии для создания неровной поверхности
  for (let i = 0; i < positionAttribute.count - 5; i++) {
    // Получаем координаты вершины
    let x = positionAttribute.getX(i);
    let y = positionAttribute.getY(i);
    let z = positionAttribute.getZ(i);

    // Сдвигаем вершину в случайных направлениях
    x += Math.sin(x) * frandom(-amount, amount);
    y += Math.sin(y) * frandom(-amount, amount);
    z += Math.sin(z) * frandom(-amount, amount);

    // Устанавливаем новые координаты вершины
    positionAttribute.setXYZ(i, x, y, z);
  }

  positionAttribute.needsUpdate = true;

  return geometry;
}