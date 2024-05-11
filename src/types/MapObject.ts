import * as THREE from 'three';
import * as CANNON from 'cannon';

export type MapObject = {
  update: (time: number) => void,
  mesh: THREE.Object3D<THREE.Object3DEventMap>,
  physicBody?: CANNON.Body
  physicY?: number
}