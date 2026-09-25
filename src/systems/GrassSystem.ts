import * as THREE from "three";
import { GrassMaterial } from "@/materials/grass";
import { GrassBladesMaterial } from "@/materials/grassBlades";
import { RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { frandom, noise } from "@/utils/random";
import { shadowSetter } from "@/utils/shadowSetter";
import { createMatrix } from "@/utils/createMatrix";
import { getDistance } from "@/utils/getDistance";
import { something } from "@/utils/something";

const FLOWER_ROTATION = Math.PI * 2;

// Свой генератор для формы травы: общий сидированный pseudoRandom трогать нельзя,
// от числа его вызовов зависит расстановка объектов комнаты и синхронизация с другими клиентами
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hash = (x: number, z: number) => {
  const value = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;

  return value - Math.floor(value);
};

/*
 * Кустик из нескольких травинок. Каждая травинка — сужающаяся полоска из сегментов,
 * изгиб и ветер считаются в шейдере. Нормали смотрят вверх, чтобы трава освещалась как земля,
 * а треугольники продублированы с обратным обходом вместо DoubleSide
 * (иначе three.js переворачивает нормаль задних граней и трава с обратной стороны чернеет)
 * */
const createClumpGeometry = (blades: number, segments: number) => {
  const rand = mulberry32(1337);
  const positions: number[] = [];
  const bladeData: number[] = [];
  const indices: number[] = [];

  for (let b = 0; b < blades; b++) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * 2.5;
    const rootX = Math.cos(angle) * radius;
    const rootZ = Math.sin(angle) * radius;

    const height = 1.5 + rand() * 2.3;
    const width = 0.18 + rand() * 0.14;
    const yaw = rand() * Math.PI;
    const leanAngle = rand() * Math.PI * 2;
    const lean = rand() * 0.9;
    const phase = rand();
    const stiffness = 0.6 + rand() * 0.6;

    const sideX = (Math.cos(yaw) * width) / 2;
    const sideZ = (Math.sin(yaw) * width) / 2;
    const first = positions.length / 3;

    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const taper = 1 - t;
      const x = rootX + Math.cos(leanAngle) * lean * t * t;
      const z = rootZ + Math.sin(leanAngle) * lean * t * t;
      const y = height * t - 0.1;

      positions.push(x - sideX * taper, y, z - sideZ * taper);
      positions.push(x + sideX * taper, y, z + sideZ * taper);
      bladeData.push(t, phase, stiffness, t, phase, stiffness);
    }

    positions.push(
      rootX + Math.cos(leanAngle) * lean,
      height - 0.1,
      rootZ + Math.sin(leanAngle) * lean
    );
    bladeData.push(1, phase, stiffness);

    for (let s = 0; s < segments - 1; s++) {
      const a = first + s * 2;
      const [b1, c, d] = [a + 1, a + 2, a + 3];

      indices.push(a, b1, c, b1, d, c);
      indices.push(a, c, b1, b1, c, d);
    }

    const lastLeft = first + (segments - 1) * 2;
    const tip = first + segments * 2;

    indices.push(lastLeft, lastLeft + 1, tip);
    indices.push(lastLeft, tip, lastLeft + 1);
  }

  const normals = new Float32Array(positions.length);

  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;

  return {
    position: new THREE.Float32BufferAttribute(positions, 3),
    normal: new THREE.BufferAttribute(normals, 3),
    blade: new THREE.Float32BufferAttribute(bladeData, 3),
    index: new THREE.Uint16BufferAttribute(indices, 1)
  };
};

export const GrassSystem = () => {
  const grassUniforms = {
    time: {
      value: 0
    }
  };

  let flowerMaterial: GrassMaterial;
  let bladesMaterial: GrassBladesMaterial;
  let clump: ReturnType<typeof createClumpGeometry>;

  const tilesWithGrass = [Tiles.Floor, Tiles.Wall, Tiles.Tree];

  return {
    update: (time: number) => {
      grassUniforms.time.value += time * 2;
    },

    createRoomMesh: (room: RoomConfig) => {
      const width = 12;
      const height = 12;
      const instancesPerTile = 20;
      const instanceNumber =
        room.tiles.filter((tile) => tilesWithGrass.includes(tile)).length *
        instancesPerTile;

      if (!flowerMaterial) {
        flowerMaterial = new GrassMaterial(grassUniforms);
        bladesMaterial = new GrassBladesMaterial(grassUniforms);
        clump = createClumpGeometry(7, 4);
      }

      const flowerMatrices: THREE.Matrix4[] = [];
      const flowerShade: number[] = [];
      const bladeMatrices: THREE.Matrix4[] = [];
      const bladeShade: number[] = [];

      for (let y = 0; y < room.height; y++) {
        for (let x = 0; x < room.width; x++) {
          const j = x + y * room.width;
          const tile = room.tiles[j];
          const absolutePoint = { x: room.x + x, z: room.y + y, y: 0 };
          const ground =
            getDistance({ x: 0, y: 0, z: 0 }, absolutePoint) > 8
              ? noise((room.x + x) / 25, (room.y + y) / 25)
              : -1;
          const shadowPower =
            ground < -0.5 ? 0 : Math.min(0.9, (ground + 0.5) * 3);

          if (!tilesWithGrass.includes(tile)) {
            continue;
          }

          for (let i = 0; i < instancesPerTile; i++) {
            const variable = 5 + (j % 5.5);

            // Порядок и число вызовов frandom/something не меняем — см. комментарий к mulberry32
            const translation = {
              x: x * 10 + frandom(-variable, variable),
              y: -2,
              z: y * 10 + frandom(-variable, variable)
            };
            const yaw = frandom(0, Math.PI);
            const roll =
              ground < -0.7
                ? something([
                    -Math.PI / 2,
                    Math.PI / 2,
                    -Math.PI / 2,
                    Math.PI / 2,
                    // цветок
                    FLOWER_ROTATION
                  ])
                : something([-Math.PI / 2, Math.PI / 2]);

            if (roll === FLOWER_ROTATION) {
              flowerMatrices.push(
                createMatrix({ translation, rotation: { y: yaw, z: roll } })
              );
              flowerShade.push(shadowPower);
            } else {
              const scale = 0.75 + hash(translation.x, translation.z) * 0.5;

              bladeMatrices.push(
                createMatrix({
                  translation: { ...translation, y: 0 },
                  rotation: { y: yaw * 2 },
                  scale: { x: scale, y: scale, z: scale }
                })
              );
              bladeShade.push(shadowPower);
            }
          }
        }
      }

      const group = new THREE.Object3D();

      if (bladeMatrices.length) {
        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute("position", clump.position);
        geometry.setAttribute("normal", clump.normal);
        geometry.setAttribute("blade", clump.blade);
        geometry.setIndex(clump.index);
        geometry.setAttribute(
          "shade",
          new THREE.InstancedBufferAttribute(new Float32Array(bladeShade), 1)
        );

        const blades = new THREE.InstancedMesh(
          geometry,
          bladesMaterial,
          bladeMatrices.length
        );

        bladeMatrices.forEach((matrix, i) => blades.setMatrixAt(i, matrix));

        // Тени трава только принимает: отбрасывать их от низкой лампы костра — это длинные рваные полосы
        // и лишние проходы рендера на каждую травинку
        shadowSetter(blades, { receiveShadow: true });

        group.add(blades);
      }

      if (flowerMatrices.length) {
        const flowers = new THREE.InstancedMesh(
          new THREE.PlaneGeometry(width, height),
          flowerMaterial,
          flowerMatrices.length
        );

        const flowerAttribute = new THREE.InstancedBufferAttribute(
          new Float32Array(flowerMatrices.length * 3),
          3
        );

        flowerMatrices.forEach((matrix, i) => {
          flowers.setMatrixAt(i, matrix);
          flowerAttribute.setXYZ(i, flowerShade[i], 0, 0);
        });

        flowers.instanceColor = flowerAttribute;

        shadowSetter(flowers, { receiveShadow: true });

        group.add(flowers);
      }

      return instanceNumber ? group : undefined;
    }
  };
};
