import * as THREE from 'three';
import {scene} from './scene.ts';
import { createLeavesMaterial } from './materials/leavesMaterial/index.ts';
import { State, state } from './state.ts';
import { Tiles } from './types/Tiles.ts';
import { frandom } from './utils/random.ts';
import { createTerrainCanvas } from './materials/terrain/index.ts';
import { makeCtx } from './utils/makeCtx.ts';

let leavesMaterial: THREE.ShaderMaterial;
let lightsCtx: CanvasRenderingContext2D;

/////////
// MESH
/////////

export const update = (time: number) => {
  leavesMaterial.uniforms.time.value += time;
  leavesMaterial.uniformsNeedUpdate = true;

  const innerRadius = 1
  const outerRadius = 5

  lightsCtx.clearRect(0, 0, lightsCtx.canvas.width, lightsCtx.canvas.height)

  //todo: генерировать статический свет в зависимости от источников света
  const c = Math.round(lightsCtx.canvas.width / 2)

  const gradient = lightsCtx.createRadialGradient(c, c, 3, c, c, outerRadius);
  gradient.addColorStop(0, 'rgba(255, 50, 0, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 0, 50, 0.1)');

  lightsCtx.beginPath()
  lightsCtx.arc(c, c, outerRadius, 0, 2 * Math.PI);

  lightsCtx.fillStyle = gradient;
  lightsCtx.fill();

  for (const id in state.objects) {
    const object = state.objects[id];

    const x = object.position.x / 10
    const y = object.position.z / 10

    if (['Box', 'Campfire'].includes(object.type)) {
      continue
    }

    const gradient = lightsCtx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
    gradient.addColorStop(0, 'rgba(200, 150, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 10, 0.1)');

    lightsCtx.beginPath()
    lightsCtx.arc(x, y, outerRadius, 0, 2 * Math.PI);

    lightsCtx.fillStyle = gradient;
    lightsCtx.fill();
  }

  leavesMaterial.uniforms.lightsImage.value = new THREE.CanvasTexture(lightsCtx.canvas)

  leavesMaterial.uniformsNeedUpdate = true;
}

const tilesWithGrass = [
  Tiles.Floor,
  Tiles.Wall,
  Tiles.Tree,
]

export const render = (state: State) => {
  lightsCtx = makeCtx(state.colls, state.rows)

  const uniforms = {
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
    terrainImage: {
      value: new THREE.CanvasTexture(createTerrainCanvas(state, 10, 4))
    },
    lightsImage: {
      value: new THREE.CanvasTexture(lightsCtx.canvas)
    }
  }
  
  leavesMaterial = createLeavesMaterial(uniforms)

  const dummy = new THREE.Object3D();
  const width = state.colls * 10
  const height = state.rows * 10
  const instancesPerTile = 150
  const instanceNumber = state.staticGrid.filter(tile => tilesWithGrass.includes(tile)).length * instancesPerTile
  const geometry = new THREE.PlaneGeometry(width, height);
  const instancedMesh = new THREE.InstancedMesh(geometry, leavesMaterial, instanceNumber);
  const instanceAttribute = new THREE.InstancedBufferAttribute(new Float32Array(instanceNumber * 3), 3);

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
      instancedMesh.setMatrixAt( instanceIndex, dummy.matrix );
      instanceAttribute.setXYZ(
        instanceIndex,
        (x / (state.colls * 10)),
        1 - (y / (state.rows * 10)),
        0
      )

      instanceIndex++
    }
  }

  instancedMesh.receiveShadow = true;
  instancedMesh.instanceColor = instanceAttribute;

  return instancedMesh
}