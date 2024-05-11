import * as THREE from 'three';
import { RoomConfig } from "../../generators/types";
import { frandom } from '../../utils/random';
import { Tiles } from '../../types/Tiles';
import { createPhysicBox, physicWorld } from '../../cannon';
import { assign } from '../../utils/assign';
import { createTree } from './tree';
import { createFloorMaterial } from './floorMaterial';
import { systems } from '../../systems/index.ts';

const scale = 10

export const Room = (config: RoomConfig) => {
  let isOnline = true
  const mesh = new THREE.Object3D();

  mesh.visible = false

  mesh.position.set(
    config.x * scale,
    0,
    config.y * scale,
  );

  const grassMesh = systems.grassSystem.createRoomMesh(config);

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(config.width * scale, config.height * scale),
    createFloorMaterial(config),
  );

  floorMesh.position.set(
    Math.floor(config.width / 2) * scale,
    0,
    Math.floor(config.height / 2) * scale,
  );

  floorMesh.rotation.x = - Math.PI / 2;
  floorMesh.receiveShadow = true;

  mesh.add(floorMesh);
  mesh.add(grassMesh);

  const treesPhysicBodies: CANNON.Body[] = []

  for (let i = 0; i < config.tiles.length; i++) {
    const x = i % config.width + frandom(-0.5, 0.5)
    const y = Math.floor(i / config.width) + frandom(-0.5, 0.5)

    if (config.tiles[i] === Tiles.Wall) {
      const cube = createTree();

      assign(cube.position, { x: x * scale, z: y * scale })
      
      const physicY = 10
      const physicBody = createPhysicBox({ x: 5, y: physicY, z: 5 }, { mass: 0 });

      physicBody.position.set(
        (config.x + x) * scale,
        physicY,
        (config.y + y) * scale,
      )

      treesPhysicBodies.push(physicBody)

      mesh.add(cube)
    }
  }

  return {
    offline: () => {
      isOnline = false

      treesPhysicBodies.forEach(body => {
        physicWorld.remove(body)
      })
    },
    online: () => {
      isOnline = true

      treesPhysicBodies.forEach(body => {
        physicWorld.addBody(body)
      })

    },
    mesh,
    floorMesh
  }
}