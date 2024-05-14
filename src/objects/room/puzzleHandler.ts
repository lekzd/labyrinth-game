import * as THREE from "three";
import { MapObject } from "../../types/MapObject";

export const createPuzzleHandler = () => {
  const target = new THREE.Object3D()

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(
      10,
      1,
      10,
    ),
    new THREE.MeshPhongMaterial({ color: 0xff0000 }),
  )
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(
      6,
      6,
      6,
    ),
    new THREE.MeshPhongMaterial({ color: 0xffcc00 }),
  )

  cube.castShadow = true
  cube.receiveShadow = true
  base.receiveShadow = true

  base.position.y = -3
  cube.position.y = 0.5

  target.add(base)
  target.add(cube)

  return {
    mesh: target,
    interactWith: (mapObject: MapObject) => {
      console.log('_debug mapObject', mapObject)
    }
  };
}