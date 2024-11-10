export const getScalarVectorAngle = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  // Вектор от второй точки к первой точке
  const vectorAX = x1 - x2;
  const vectorAY = y1 - y2;

  // Вектор от второй точки к точке (0, 0)
  const vectorBX = -x2;
  const vectorBY = -y2;

  // Скалярное произведение векторов
  const dotProduct = vectorAX * vectorBX + vectorAY * vectorBY;

  // Длины векторов
  const magnitudeA = Math.sqrt(vectorAX ** 2 + vectorAY ** 2);
  const magnitudeB = Math.sqrt(vectorBX ** 2 + vectorBY ** 2);

  // Косинус угла
  const cosTheta = dotProduct / (magnitudeA * magnitudeB);

  // Угол в радианах
  let angleRad = Math.acos(Math.min(1, Math.max(-1, cosTheta))); // ограничиваем cosTheta в диапазоне [-1, 1]

  // Определяем направление угла с помощью векторного произведения
  const crossProduct = vectorAX * vectorBY - vectorAY * vectorBX;
  if (crossProduct > 0) {
    // Если векторное произведение положительное, угол по часовой стрелке
    angleRad = 2 * Math.PI - angleRad;
  }

  return angleRad;
};
