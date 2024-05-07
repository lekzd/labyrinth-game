import * as THREE from 'three';
import vertexShader from './shader.vert'
import fragmentShader from './shader.frag'

type Uniforms = {
  time: {
    value: number;
  };
  directionalLightColor: {
    value: number[];
  };
  fogColor: {
    value: any;
  };
  fogNear: {
    value: any;
  };
  fogFar: {
    value: any;
  };
  terrainImage: {
    value: any;
  }
  lightsImage: {
    value: any;
  }
}

export const createLeavesMaterial = (uniforms: Uniforms) => {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: THREE.DoubleSide,
  });
}
