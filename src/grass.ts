import * as THREE from 'three';
import {scene} from './scene.ts';
import { createLeavesMaterial } from './materials/leavesMaterial/index.ts';

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
}

const leavesMaterial = createLeavesMaterial(uniforms)

/////////
// MESH
/////////

const dummy = new THREE.Object3D();

export const update = (time) => {
  leavesMaterial.uniforms.time.value += time;
  leavesMaterial.uniformsNeedUpdate = true;
}

export const render = (width, height) => {
  const instanceNumber = width * height * 2
  const geometry = new THREE.PlaneGeometry(width, height);
  const instancedMesh = new THREE.InstancedMesh(geometry, leavesMaterial, instanceNumber );

  for ( let i=0 ; i<instanceNumber ; i++ ) {

    dummy.position.set(
      ( Math.random() - 0.5 ) * width,
      0,
      ( Math.random() - 0.5 ) * height
    );

    dummy.scale.setScalar( 0.001 + Math.random() * 0.001 );

    dummy.rotation.y = Math.random() * Math.PI;
    dummy.rotation.x = Math.random() * (Math.PI / 2);

    dummy.updateMatrix();
    instancedMesh.setMatrixAt( i, dummy.matrix );
    instancedMesh.receiveShadow = true;
  }

  return instancedMesh
}