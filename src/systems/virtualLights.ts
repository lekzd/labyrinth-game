import type { PointLight } from "three";

// Реестр без зависимостей: virtualLight вызывается при инициализации модулей (например, WEAPONS_CONFIG),
// и циклические импорты через systems/index не должны до него дотягиваться
export const lightSources = new Set<PointLight>();

// Лампа не рендерится сама — LightSystem переносит её параметры в пул настоящих ламп
export const virtualLight = (light: PointLight) => {
  light.visible = false;
  lightSources.add(light);

  return light;
};
