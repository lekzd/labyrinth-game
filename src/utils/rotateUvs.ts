import { BufferGeometry } from "three";

export const rotateUvs = (
  geometry: BufferGeometry,
): BufferGeometry => {
  // Получаем uv атрибут из геометрии
  const uvs = geometry.attributes.uv.array;

  // Проходим по каждому набору координат (u, v) и поворачиваем их на 90 градусов
  for (let i = 0; i < uvs.length; i += 2) {
    const u = uvs[i];
    const v = uvs[i + 1];

    // Поворот на 90 градусов по часовой стрелке (замена u и v местами)
    uvs[i] = v;
    uvs[i + 1] = 1.0 - u;
  }

  // Указываем, что атрибуты UV были изменены, чтобы они перегенерировались
  geometry.attributes.uv.needsUpdate = true;

  return geometry;
};
