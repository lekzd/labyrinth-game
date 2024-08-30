import * as THREE from "three";
import { GrassMaterial } from "@/materials/grass";
import { state } from "@/state";
import { makeCtx } from "@/utils/makeCtx";
import { createTerrainCanvas } from "@/materials/terrain";
import { RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { frandom } from "@/utils/random";

export const GrassSystem = () => {
  const lightsCtx = makeCtx(state.colls, state.rows);

  const grassUniforms = {
    time: {
      value: 0,
    },
    terrainImage: {
      value: new THREE.Texture(),
    },
  };

  const tilesWithGrass = [Tiles.Floor, Tiles.Wall, Tiles.Tree];

  return {
    update: (time: number) => {
      grassUniforms.time.value += time * 2;
    },

    updateTerrainTexture: () => {
      grassUniforms.terrainImage.value = new THREE.CanvasTexture(createTerrainCanvas(state, 10, 4))
    },

    createRoomMesh: (room: RoomConfig) => {
      const dummy = new THREE.Object3D();
      const width = 6;
      const height = 6;
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

      for (let j = 0; j < room.tiles.length; j++) {
        const tile = room.tiles[j];
        const x = j % room.width;
        const y = Math.floor(j / room.width);
        const shaderX = (room.x + x) / lightsCtx.canvas.width;
        const shaderY = 1 - (room.y + y) / lightsCtx.canvas.height;

        if (!tilesWithGrass.includes(tile)) {
          continue;
        }

        for (let i = 0; i < instancesPerTile; i++) {
          const variable = 5 + (j % 5.5);

          dummy.position.set(
            x * 10 + frandom(-variable, variable),
            2,
            y * 10 + frandom(-variable, variable)
          );

          dummy.rotation.y = frandom(0, Math.PI);

          dummy.updateMatrix();
          instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
          instanceAttribute.setXYZ(instanceIndex, shaderX, shaderY, 0);

          instanceIndex++;
        }
      }

      instancedMesh.receiveShadow = true;
      instancedMesh.instanceColor = instanceAttribute;

      return instancedMesh;
    },
  };
};
