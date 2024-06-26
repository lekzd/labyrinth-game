import * as THREE from 'three';
import * as CANNON from 'cannon';
import { DynamicObject } from './DynamicObject';

export type MapObject = {
  props: DynamicObject,
  update: (time: number) => void,
  mesh: THREE.Mesh,
  physicBody?: CANNON.Body
  physicY?: number
  interactWith?: (value: boolean) => void
  setFocus?: (value: boolean) => void
}