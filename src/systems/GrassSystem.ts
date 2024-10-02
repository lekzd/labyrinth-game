import * as THREE from "three";
import { GrassMaterial } from "@/materials/grass";
import { RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { frandom, noise } from "@/utils/random";
import { shadowSetter } from "@/utils/shadowSetter";
import { createMatrix } from "@/utils/createMatrix";
import { getDistance } from "@/utils/getDistance";
import { something } from "@/utils/something";

export const GrassSystem = () => {
  const grassUniforms = {
    time: {
      value: 0
    }
  };

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

      const geometry = new THREE.PlaneGeometry(width, height);
      const grassMaterial = new GrassMaterial(grassUniforms);
      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        grassMaterial,
        instanceNumber
      );

      const instanceAttribute = new THREE.InstancedBufferAttribute(
        new Float32Array(instanceNumber * 3),
        3
      );

      let instanceIndex = 0;

      for (let y = 0; y < room.height; y++) {
        for (let x = 0; x < room.width; x++) {
          const j = x + y * room.width;
          const tile = room.tiles[j];
          const absolutePoint = { x: room.x + x, z: room.y + y, y: 0 };
          const ground =
            getDistance({ x: 0, y: 0, z: 0 }, absolutePoint) > 20
              ? noise((room.x + x) / 25, (room.y + y) / 25)
              : -1;
          const shadowPower =
            ground < -0.5 ? 0 : Math.min(0.9, (ground + 0.5) * 3);
          const lightPower = 0;

          if (!tilesWithGrass.includes(tile)) {
            continue;
          }

          for (let i = 0; i < instancesPerTile; i++) {
            const variable = 5 + (j % 5.5);

            const matrix = createMatrix({
              translation: {
                x: x * 10 + frandom(-variable, variable),
                y: -2,
                z: y * 10 + frandom(-variable, variable)
              },
              rotation: {
                y: frandom(0, Math.PI),
                z:
                  ground < -0.7
                    ? something([
                        -Math.PI / 2,
                        Math.PI / 2,
                        -Math.PI / 2,
                        Math.PI / 2,
                        // цветок
                        Math.PI * 2
                      ])
                    : something([-Math.PI / 2, Math.PI / 2])
              }
            });

            instancedMesh.setMatrixAt(instanceIndex, matrix);
            instanceAttribute.setXYZ(instanceIndex, shadowPower, lightPower, 0);

            instanceIndex++;
          }
        }
      }

      shadowSetter(instancedMesh, {
        castShadow: true,
        receiveShadow: true
      });

      instancedMesh.instanceColor = instanceAttribute;

      return instancedMesh;
    }
  };
};
