import { Object3D, PointLight, Vector3 } from "three";
import { scene } from "@/scene";
import { shadowSetter } from "@/utils/shadowSetter";
import { systems } from ".";
import { lightSources as sources } from "./virtualLights";

// Сколько настоящих ламп всегда стоит в сцене
const POOL_SIZE = 4;

/*
 * three.js перекомпилирует шейдеры всех материалов, когда меняется число ламп в сцене
 * (комнаты с факелами включаются/выключаются при движении — отсюда фризы).
 * Поэтому число ламп фиксировано: объекты регистрируют свои PointLight как виртуальные (невидимые),
 * а система каждый кадр копирует параметры ближайших к камере в пул настоящих ламп.
 * */

const isInScene = (object: Object3D) => {
  let current = object.parent;

  while (current) {
    if (current === scene) return true;
    if (!current.visible) return false;

    current = current.parent;
  }

  return false;
};

export const LightSystem = () => {
  const pool: PointLight[] = [];
  const position = new Vector3();
  const candidates: { light: PointLight; score: number }[] = [];

  const init = () => {
    for (let i = 0; i < POOL_SIZE; i++) {
      const light = new PointLight(0xffffff, 0);

      pool.push(light);
      scene.add(light);
    }

    // Тень только у ближайшей лампы: каждая point-тень — это 6 доп. проходов рендера
    const [shadowLight] = pool;

    shadowLight.shadow.mapSize.set(256, 256);
    shadowLight.shadow.camera.near = 0.5;
    shadowLight.shadow.camera.far = 25;

    shadowSetter(shadowLight, { castShadow: true });
  };

  return {
    update() {
      if (!pool.length) init();

      const { camera } = systems.uiSettingsSystem;

      candidates.length = 0;

      for (const light of sources) {
        if (!isInScene(light)) continue;

        light.getWorldPosition(position);

        // Мощные лампы с большим радиусом выигрывают у слабых на той же дистанции
        candidates.push({
          light,
          score: position.distanceTo(camera.position) - light.distance
        });
      }

      candidates.sort((a, b) => a.score - b.score);

      pool.forEach((slot, i) => {
        const source = candidates[i]?.light;

        if (!source) {
          slot.intensity = 0;
          return;
        }

        source.getWorldPosition(slot.position);
        slot.color.copy(source.color);
        slot.intensity = source.intensity;
        slot.distance = source.distance;
        slot.decay = source.decay;
      });
    }
  };
};
