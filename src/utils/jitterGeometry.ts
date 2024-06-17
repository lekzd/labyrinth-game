import { BufferGeometry } from "three";

export const jitterGeometry = (geometry: BufferGeometry, amount: number): BufferGeometry => {
  const positionAttribute = geometry.getAttribute('position');

  // Модификация вершин геометрии для создания неровной поверхности
  for (let i = 0; i < positionAttribute.count - 5; i++) {
    // Получаем координаты вершины
    let x = positionAttribute.getX(i);
    let y = positionAttribute.getY(i);
    let z = positionAttribute.getZ(i);

    // Сдвигаем вершину в случайных направлениях
    // x += frandom(-amount, amount);
    // y += frandom(-amount, amount);
    // z += frandom(-amount, amount);
    x += Math.sin(x) * amount;
    y += Math.sin(y) * amount;
    z += Math.sin(z) * amount;

    // Устанавливаем новые координаты вершины
    positionAttribute.setXYZ(i, x, y, z);
  }

  positionAttribute.needsUpdate = true;

  return geometry;
}