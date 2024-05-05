import * as THREE from 'three';

export const scene = new THREE.Scene()

scene.background = new THREE.Color(0xa000000);
scene.fog = new THREE.Fog(0x000000, 1, 200);