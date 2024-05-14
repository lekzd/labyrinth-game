import * as THREE from "three";
import * as TWEEN from '@tweenjs/tween.js'
import { MapObject } from "../../types/MapObject";
import { systems } from "../../systems";
import { loads } from "../../loader";

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
  const runicTexture = loads.texture["runic_2.png"]?.clone()!
  runicTexture.wrapS = THREE.RepeatWrapping
  runicTexture.wrapT = THREE.RepeatWrapping

  runicTexture.repeat = new THREE.Vector2(1 / 4, 1 / 3)

  const materials: THREE.MeshLambertMaterial[] = []

  const coordsMap = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 2 },
  ]

  for (let i = 0; i < 6; i++) {
    const map = loads.texture["runic_2.png"]?.clone()!
    const { x, y } = coordsMap[i]
  
    map.repeat = new THREE.Vector2(1 / 4, 1 / 3)
    map.offset = new THREE.Vector2((1 / 4) * x, (1 / 3) * y)

    materials.push(
      new THREE.MeshLambertMaterial({ map,  })
    )
  }

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(
      6,
      6,
      6,
    ),
    materials,
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