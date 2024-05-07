import * as THREE from 'three';
import {scene} from './scene.ts';
import { createLeavesMaterial } from './materials/leavesMaterial/index.ts';
import { State } from './state.ts';
import { Tiles } from './types/Tiles.ts';
import { frandom } from './utils/random.ts';

export const uniforms = {
  time: {
    value: 0
  },
  directionalLightColor: {
    value: [0.3, 0.15, 0]
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
}

const leavesMaterial = createLeavesMaterial(uniforms)

/////////
// MESH
/////////

export const update = (time) => {
  leavesMaterial.uniforms.time.value += time;
  leavesMaterial.uniformsNeedUpdate = true;
}

const tilesWithGrass = [
  Tiles.Floor,
  Tiles.Wall,
  Tiles.Tree,
]

export const render = (state: State) => {
  const dummy = new THREE.Object3D();
  const width = state.colls * 10
  const height = state.rows * 10
  const instancesPerTile = 150
  const instanceNumber = state.staticGrid.filter(tile => tilesWithGrass.includes(tile)).length * instancesPerTile
  const geometry = new THREE.PlaneGeometry(width, height);
  const instancedMesh = new THREE.InstancedMesh(geometry, leavesMaterial, instanceNumber );

  let instanceIndex = 0

  for (let j = 0; j < state.staticGrid.length; j++) {
    const tile = state.staticGrid[j];
    const x = (j % state.colls) * 10
    const y = Math.floor(j / state.colls) * 10

    if (!tilesWithGrass.includes(tile)) {
      continue
    }

    for ( let i=0 ; i<instancesPerTile ; i++ ) {
      const variable = 5 + j % 5.5

      dummy.position.set(
        (width * -0.5) + x + frandom(-variable, variable),
        0,
        (height * -0.5) + y + frandom(-variable, variable),
      );
  
      dummy.scale.setScalar( 0.001 + Math.random() * 0.001 );
  
      dummy.rotation.y = frandom(0, Math.PI);
      dummy.rotation.x = frandom(0, Math.PI / 2);
  
      dummy.updateMatrix();
      instancedMesh.setMatrixAt( instanceIndex++, dummy.matrix );
    }
  }

  instancedMesh.receiveShadow = true;

  return instancedMesh
}