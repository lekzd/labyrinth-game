import { Vector3Like } from "three";

export function getDistance(pos1: Vector3Like, pos2: Vector3Like) {
  // Вычисляем разность координат
  const deltaX = pos2.x - pos1.x;
  const deltaY = pos2.z - pos1.z;

  // Вычисляем квадраты разностей координат
  const squaredDistance = deltaX * deltaX + deltaY * deltaY;

  return Math.sqrt(squaredDistance);
}
