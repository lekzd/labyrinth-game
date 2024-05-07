import * as THREE from 'three';
import { DynamicObject } from "../../types/DynamicObject";

export const Box = (props: DynamicObject) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshPhongMaterial({ color: 0xffffff, fog: true }),
  )

  Object.assign(mesh.position, props.position)
  Object.assign(mesh.quaternion, props.rotation)

  mesh.receiveShadow = true
  mesh.castShadow = true

  return {
    mesh,
    update: (time: number) => {}
  }
}