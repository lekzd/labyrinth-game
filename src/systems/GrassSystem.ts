import * as THREE from "three";
import { loads, modelType } from "@/loader";
import { GrassMaterial } from "@/materials/grass";
import { state } from "@/state";
import { makeCtx } from "@/utils/makeCtx";
import { createTerrainCanvas } from "@/materials/terrain";
import { scene } from "@/scene";
import { RoomConfig } from "@/types";
import { DynamicObject } from "@/types";
import { Tiles } from "@/config";
import { frandom } from "@/utils/random";
import { systems } from ".";

export const GrassSystem = () => {
  const lightsCtx = makeCtx(state.colls, state.rows);

  const grassUniforms = {
    time: {
      value: 0,
    },
    directionalLightColor: {
      value: [0.3, 0.15, 0],
    },
    fogColor: {
      value: scene.fog.color,
    },
    fogNear: {
      value: scene.fog.near,
    },
    fogFar: {
      value: scene.fog.far,
    },
    textureImage: {
      value: loads.texture["grass.webp"],
    },
    terrainImage: {
      value: new THREE.CanvasTexture(createTerrainCanvas(state, 10, 4)),
    },
    lightsImage: {
      value: new THREE.CanvasTexture(lightsCtx.canvas),
    },
  };

  const grassMaterial = new GrassMaterial(grassUniforms);

  const getObjectGradient = (object: DynamicObject) => {
    switch (object.type) {
      case "Campfire":
        return (x: number, y: number) => {
          const gradient = lightsCtx.createRadialGradient(x, y, 3, x, y, 5);
          gradient.addColorStop(0, "rgba(255, 50, 0, 0.5)");
          gradient.addColorStop(1, "rgba(0, 0, 50, 0.1)");

          return gradient;
        };
      case modelType.Cleric:
      case modelType.Monk:
      case modelType.Rogue:
      case modelType.Warrior:
      case modelType.Wizard:
        return (x: number, y: number) => {
          const gradient = lightsCtx.createRadialGradient(x, y, 1, x, y, 5);
          gradient.addColorStop(0, "rgba(200, 150, 0, 0.3)");
          gradient.addColorStop(1, "rgba(0, 0, 10, 0.1)");

          return gradient;
        };
      default:
        return null;
    }
  };

  const tilesWithGrass = [Tiles.Floor, Tiles.Wall, Tiles.Tree];

  return {
    update: (time: number) => {
      lightsCtx.clearRect(
        0,
        0,
        lightsCtx.canvas.width,
        lightsCtx.canvas.height
      );

      lightsCtx.fillStyle = systems.environmentSystem.values.grassColor.getStyle()
      lightsCtx.fillRect(
        0,
        0,
        lightsCtx.canvas.width,
        lightsCtx.canvas.height
      )

      for (const id in state.objects) {
        const object = state.objects[id];

        const x = object.position.x / 10;
        const y = object.position.z / 10;

        const getGradient = getObjectGradient(object);

        if (!getGradient) {
          continue;
        }

        const gradient = getGradient(x, y);

        lightsCtx.beginPath();
        lightsCtx.arc(x, y, 5, 0, 2 * Math.PI);

        lightsCtx.fillStyle = gradient;
        lightsCtx.fill();
      }

      grassUniforms.time.value += time;
      grassUniforms.lightsImage.value.needsUpdate = true;
      grassUniforms.textureImage.value = loads.texture["grass.webp"];
      grassMaterial.uniformsNeedUpdate = true;
    },

    updateTerrainTexture: () => {
      grassMaterial.uniforms.terrainImage.value = new THREE.CanvasTexture(createTerrainCanvas(state, 10, 4))
      grassMaterial.uniformsNeedUpdate = true
    },

    createRoomMesh: (room: RoomConfig) => {
      const dummy = new THREE.Object3D();
      const width = 2;
      const height = 6;
      const instancesPerTile = 75;
      const instanceNumber =
        room.tiles.filter((tile) => tilesWithGrass.includes(tile)).length *
        instancesPerTile;
      const geometry = new THREE.PlaneGeometry(width, height);
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
            0,
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
