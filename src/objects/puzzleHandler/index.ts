import * as CANNON from "cannon";
import { BoxGeometry, Mesh, MeshPhongMaterial, Object3DEventMap } from "three";
import * as THREE from 'three'
import { loads } from "../../loader";
import { DynamicObject } from "../../types/DynamicObject";
import { createInteractivitySign } from "./interactivitySign";
import { createPhysicBox } from "../../cannon";

const PHYSIC_Y = 4;
export class PuzzleHandler {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly physicBody: CANNON.Body
  readonly physicY = PHYSIC_Y
  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = initMesh(props);
    this.physicBody = initPhysicBody()

    correctionPhysicBody(this.physicBody, this.mesh)
  }
  update(time: number) {}
}

function correctionPhysicBody(
  physicBody: CANNON.Body,
  target: THREE.Object3D<Object3DEventMap>
) {
  physicBody.position.set(
    target.position.x,
    target.position.y + PHYSIC_Y,
    target.position.z
  );
  physicBody.quaternion.copy(target.quaternion);
}

function initMesh(props: DynamicObject) {
  const target = new THREE.Group()

  target.name = 'PuzzleHandler'

  Object.assign(target.position, props.position);
  Object.assign(target.quaternion, props.rotation);

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

  const sign = createInteractivitySign()

  sign.mesh.position.y = 7.5

  target.add(sign.mesh)
  target.add(base)
  target.add(cube)

  return target
}

function initPhysicBody() {
  const physicRadius = 4
  return createPhysicBox({ x: physicRadius, y: PHYSIC_Y * 2, z: physicRadius }, { mass: 0 });
}
