import * as THREE from 'three';
import * as CANNON from 'cannon';
import { DynamicObject } from './DynamicObject';
import { StateEntity } from '../objects/entities/StateEntity';

export type MapObject = {
  props: DynamicObject,
  update: (time: number) => void,
  state: StateEntity,
  mesh: THREE.Mesh,
  physicBody?: CANNON.Body
  physicY?: number
  interactWith?: (value: boolean) => void
  setFocus?: (value: boolean) => void
  hit?: (value: DynamicObject, point: THREE.Vector3 | null) => void
}