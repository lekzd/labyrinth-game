import * as THREE from "three";
import * as TWEEN from '@tweenjs/tween.js'
import { MapObject } from "../../types/MapObject";
import { systems } from "../../systems";

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

  let busyOnInteraction = false

  return {
    mesh: target,
    interactWith: (mapObject: MapObject) => {
      const { input } = systems.inputSystem

      if (!busyOnInteraction && input.interact) {
        new TWEEN.Tween(cube.rotation)
          .to( { y: cube.rotation.y + (Math.PI / 2) }, 700)
          .start()

        setTimeout(() => {
          busyOnInteraction = false
        }, 1000)
        busyOnInteraction = true
      }
      
    }
  };
}