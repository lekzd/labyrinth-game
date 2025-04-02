import * as THREE from 'three';
import { DynamicObject } from '@/types';
import { StateEntity } from '@/entities/StateEntity';
import { PhysicEntity } from '@/entities/PhysicEntity';

export type MapObject = {
  props: DynamicObject,
  update: (time: number) => void,
  state: StateEntity,
  mesh: THREE.Mesh,
  physicEntity?: PhysicEntity
  physicY?: number
  interactWith?: (value: boolean) => void
  setFocus?: (value: boolean) => void
  hit?: (value: DynamicObject, point: THREE.Vector3 | null) => void
}