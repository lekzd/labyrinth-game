import * as THREE from 'three';

export const scene = new THREE.Scene()

scene.background = new THREE.Color(0x06000f);
scene.fog = new THREE.Fog(0x000000, 1, 400);
// scene.fog = new THREE.Fog(0x000000, Infinity, Infinity);

console.log('_debug scene', scene)