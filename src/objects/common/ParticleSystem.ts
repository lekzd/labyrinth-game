import { frandom } from "@/utils/random";
import { BufferAttribute, BufferGeometry, Material, Points } from "three";

interface Props {
  count: number;
  material: Material;
  x: [number, number];
  y: [number, number];
  z: [number, number];
  size: [number, number];
  speed: [number, number];
}

export const ParticleSystem = ({ count, material, x, y, z, size, speed }: Props) => {
  // Создание массивов для хранения позиций частиц
  const positions = new Float32Array(count * 3); // 3 компоненты (x, y, z) на каждую частицу
  const indexes = new Float32Array(count * 3); // 3 компоненты (x, y, z) на каждую частицу

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = frandom(...x); // Рандомное положение частицы по оси X
    positions[i + 1] = frandom(...y); // Рандомное положение частицы по оси Y
    positions[i + 2] = frandom(...z); // Рандомное положение частицы по оси Z

    indexes[i] = i / positions.length;
    indexes[i + 1] = frandom(...size);
    indexes[i + 2] = frandom(...speed);
  }
  // Создание буферной геометрии для частиц
  const particleGeometry = new BufferGeometry();
  particleGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  particleGeometry.setAttribute("values", new BufferAttribute(indexes, 3));

  return new Points(particleGeometry, material);
};
