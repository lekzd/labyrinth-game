import {socket} from "@/socket.ts";
import {mergeDeep} from "@/utils/mergeDeep.ts";
import {scale} from "@/state.ts";
import {Tiles} from "@/config";
import {NpcAnimationStates} from "@/objects/hero/NpcAnimationStates.ts";
import {
  Quaternion,
  Vector3,
} from "three";
import { pickBy } from "@/utils/pickBy.ts";
import {settings} from "@/objects/hero/settings.ts";
import {modelType} from "@/loader.ts";

const { onUpdate, send, connect } = socket({ name: 'MOBS', update: false, send: false  });

/*
* Не завязывается на стор и живет на своем сокете, чтобы иметь возможность переместиться с фронта на бэк
* Не сильно хочется выполнять эту логику на бэкенде, чтобы тратилось меньше ресурсв, а бэк был прозрачным (без завязки на бизнем логику)
*
* */

const getQuaternion = (pos1, pos2) => {
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
  const state = {}, spawners = {}, dies = {};

  const next = (change) => {
    mergeDeep(state, change);
    send(change);
  }

  const init = ({ rooms }) => {
    Object.values(rooms).forEach((room) => {
      room.tiles.forEach((tile, i) => {
        const x = (room.x + (i % room.width)) * scale;
        const y = 0;
        const z = (room.y + Math.floor(i / room.width)) * scale;

        if (tile !== Tiles.Spawner) return;

        spawners[`${x}.${y}.${z}`] = { x, y, z }
      })
    })
  }

  // Подписаться на обновления сервера
  onUpdate((next) => {
    mergeDeep(state, next);

    for (const id in (next.objects || {})) {
      // console.log('id', id)
      // TODO: почему-то не приходит null у скелетона
      if (id.startsWith('mob') && !next.objects[id]) {
        dies[id] = true;
        setTimeout(() => { delete dies[id]; }, 10000)
      }
    }

    if (next.rooms) {
      init(next);
    }
  })

  connect();
  const attackCoolDown = {};

  const tick = () => {
    for (const key in spawners) {
      const id = `mob:${key}`;
      let item = state.objects[id];

      // Если есть моб у спавнера смотрим на него, иначе на позицию спавнера
      const pos = item?.position || spawners[key];
      let distance = Infinity, position, person;

      // Смотрим количество персонажей у спавнера
      for (const id in (state?.players || {})) {
        const { activeObjectId } = state?.players[id];

        const pers = state.objects[activeObjectId];
        if (!pers) continue;

        const persDistance = calculateDistance(pos, pers.position);

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
          state: NpcAnimationStates.idle,
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
              state: NpcAnimationStates.walk,
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
              state: NpcAnimationStates.spell1,
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

    setTimeout(tick, 500);
  }

  setTimeout(tick, 1000);
}

function calculateDistance(pos1, pos2) {
  // Вычисляем разность координат
  const deltaX = pos2.x - pos1.x;
  const deltaY = pos2.z - pos1.z;

  // Вычисляем квадраты разностей координат
  const squaredDistance = deltaX * deltaX + deltaY * deltaY;

  return Math.sqrt(squaredDistance);
}

function changeCoordinate(pos1, pos2, delta) {
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