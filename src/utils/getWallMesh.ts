import * as THREE from "three";
import { scale } from "../state.ts";
import { frandom } from "./random.ts";

export const getWallMesh = (points: { x: number; y: number; }[]) => {
  const wallHeight = 3 * scale;

  const vertices = [];
  for (let i = 0; i < points.length; i++) {
    const x = points[i].x * scale;
    const y = points[i].y * scale;

    vertices.push(x, y, frandom(2, 10)); // нижняя часть
    vertices.push(x + frandom(-10, 10), y + frandom(-10, 10), wallHeight); // верхняя часть
  }

  // Индексы для построения треугольников
  const indices = [];
  const pointCount = points.length;
  for (let i = 0; i < pointCount - 1; i++) {
    // нижний треугольник
    indices.push(i * 2, i * 2 + 1, (i + 1) * 2);
    // верхний треугольник
    indices.push(i * 2 + 1, (i + 1) * 2 + 1, (i + 1) * 2);
  }

  // Создаем BufferGeometry и устанавливаем атрибуты
  const wallGeometry = new THREE.BufferGeometry();
  wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  wallGeometry.setIndex(indices);

  // Вычисляем нормали для корректного отображения освещения
  wallGeometry.computeVertexNormals();

  const wallMesh = new THREE.Mesh(
    wallGeometry,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#181c06'),
      flatShading: true
    })
  );

  wallMesh.position.set(
    0,
    wallHeight,
    0
  );

  wallMesh.rotation.x = Math.PI / 2;

  return wallMesh;
};
