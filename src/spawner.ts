import {socket} from "@/socket.ts";
import {mergeDeep} from "@/utils/mergeDeep.ts";
import {State, scale} from "@/state.ts";
import {Tiles} from "@/config";
import {NpcAnimationStates} from "@/objects/hero/NpcAnimationStates.ts";
import {
  Quaternion,
  Vector3,
  Vector3Like,
} from "three";
import { pickBy } from "@/utils/pickBy.ts";
import {settings} from "@/objects/hero/settings.ts";
import {modelType} from "@/loader.ts";
import { RecursivePartial } from "./types/RecursivePartial";
import { DynamicObject } from "./types/DynamicObject";
import { systems } from "./systems";
import { getDistance } from "./utils/getDistance";
import {getWorld} from "@/generators/getWorld.ts";

const { onUpdate, send, connect } = socket({ name: 'MOBS', update: false, send: false  });

/*
* Не завязывается на стор и живет на своем сокете, чтобы иметь возможность переместиться с фронта на бэк
* Не сильно хочется выполнять эту логику на бэкенде, чтобы тратилось меньше ресурсв, а бэк был прозрачным (без завязки на бизнем логику)
*
* */

const getQuaternion = (pos1: Vector3Like, pos2: Vector3Like) => {
  // TODO: вычесления отвязать от плоскости Threejs
  const point1 = new Vector3(pos1.x, pos1.y, pos1.z); // P1
  const point2 = new Vector3(pos2.x, pos2.y, pos2.z); // P2

  // Вычислите направление движения
  const direction = new Vector3().subVectors(point2, point1).normalize();

  // Для создания кватерниона вам нужно знать начальное направление
  // Например, предположим, что ваше начальное направление - это +X
  const initialDirection = new Vector3(0, 0, 1);

  // Рассчитайте кватернион, который поворачивает из начального направления в новое направление
  const quaternion = new Quaternion();
  quaternion.setFromUnitVectors(initialDirection, direction);

  return pickBy(quaternion, ['x', 'y', 'z', 'w'])
}


export const Spawners = async (count = 1) => {
  const state: Partial<State> = {};
  const dies: Record<string, boolean> = {};

  const next = (change: RecursivePartial<State>) => {
    mergeDeep(state, change);
    send(change);
  }

  // Подписаться на обновления сервера
  onUpdate((next: RecursivePartial<State>) => {
    mergeDeep(state, next);

    for (const id in (next.objects || {})) {
      // console.log('id', id)
      // TODO: почему-то не приходит null у скелетона
      if (id.startsWith('mob') && !next.objects?.[id]) {
        dies[id] = true;
        setTimeout(() => { delete dies[id]; }, 10000)
      }
    }
  })

  connect();
  const attackCoolDown: Record<string, boolean> = {};

  const tick = () => {
    setTimeout(tick, 500);
    
    if (!systems.uiSettingsSystem.settings.game.enemy_ai) {
      return;
    }
    const spawners = {};

    for (const id in (state?.players || {})) {
      const {activeObjectId} = state.players?.[id];

      const { position } = state.objects?.[activeObjectId]!;
      const base = { x: Math.floor(position.x / scale), y: Math.floor(position.y / scale) };

      for (let y = base.y -50; y < base.y +50; y++) {
        for (let x = base.x -50; x < base.x +50; x++) {
          const tile = getWorld(x, y);

          if (tile === Tiles.Spawner) {
            spawners[`${x}:${y}`] = {
              x: x * scale,
              y: 0,
              z: y * scale
            };
          }
        }
      }
    }

    for (const key in spawners) {
      const id = `mob:${key}`;
      let item = state.objects?.[id]!;

      // Если есть моб у спавнера смотрим на него, иначе на позицию спавнера
      const pos = item?.position || spawners[key];
      let distance = Infinity;
      let position: Vector3Like;
      let person: DynamicObject;

      // Смотрим количество персонажей у спавнера
      for (const id in (state?.players || {})) {
        const { activeObjectId } = state.players?.[id];

        const pers = state.objects?.[activeObjectId];
        if (!pers) continue;

        const persDistance = getDistance(pos, pers.position);

        if (distance > persDistance) {
          distance = persDistance;
          position = pers.position;
          person = pers;
        }
      }

      if (distance > 150 || item?.health <= 0 || dies[id]) continue;

      // Если нет создаем
      if (!item) {
        const { x, y, z } = pos;
        const type = modelType.Skeleton_Mage;
        item = {
          id,
          type,
          ...settings[type],
          baseAnimation: NpcAnimationStates.idle,
          position: { x, y, z },
          rotation: { w: 0.548628892113074, x: 0, y: -0.8360659894642256, z: 0 }
        };

        next({ objects: { [item.id]: item } });
      }

      // Если кто-то рядом идем
      if (distance > 10 && distance < 100) {
        next({
          objects: {
            [item.id]: {
              baseAnimation: NpcAnimationStates.walk,
              rotation: getQuaternion(item.position, position),
              position: changeCoordinate(item.position, position, 5)
            }
          }
        });
      }

      // Если кто-то супер тут то бьем
      if (distance <= 10) {
        next({
          objects: {
            [item.id]: {
              additionsAnimation: NpcAnimationStates.spell1,
            }
          }
        });
        // Если секунду не бил то наносим урон
        if (!attackCoolDown[item.id]) {
          next({
            objects: {
              [person.id]: {
                health: state.objects[person.id].health - item.attack,
              }
            }
          });
          attackCoolDown[item.id] = true;

          setTimeout(() => {
            delete attackCoolDown[item.id];
          }, 1000);
        }
      }
    }
  }

  setTimeout(tick, 1000);
}

function changeCoordinate(pos1: Vector3Like, pos2: Vector3Like, delta: number) {
  // Вычисляем разность координат по осям x и y
  const deltaX = pos2.x - pos1.x;
  const deltaY = pos2.z - pos1.z;

  // Вычисляем расстояние между двумя координатами
  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  // Вычисляем новые координаты
  const newX = pos1.x + (deltaX / distance) * delta;
  const newY = pos1.z + (deltaY / distance) * delta;

  // Создаем новый объект координат с измененными значениями
  const newCoord = { ...pos1, x: newX, z: newY };

  return newCoord;
}