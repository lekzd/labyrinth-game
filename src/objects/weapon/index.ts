import * as CANNON from "cannon";
import { BoxGeometry, Mesh, MeshPhongMaterial, Object3DEventMap, TextureLoader, Vector3Like } from "three";
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { loads } from "../../loader";
import { DynamicObject } from "../../types/DynamicObject";
import { createInteractivitySign } from "../../utils/interactivitySign";
import { createPhysicBox } from "../../cannon";
import { systems } from "../../systems";
import {currentPlayer} from "../../main.ts";
import {state} from "../../state.ts";

const PHYSIC_Y = 4;
export class Weapon {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly physicBody: CANNON.Body
  readonly physicY = PHYSIC_Y

  private focusInterval = 0
  private focusAnimation = false
  private busyOnInteraction = false
  sign: { mesh: Mesh<THREE.ConeGeometry, THREE.ShaderMaterial, Object3DEventMap>; setFocused: (value: boolean) => void; };
  cube: Mesh<BoxGeometry, THREE.MeshLambertMaterial[], Object3DEventMap>;

  constructor(props: DynamicObject) {
    const model = loads.weapon[props.type];

    if (!model) {
      throw Error(`No model with type "${props.type}"`);
    }

    this.props = props;
    this.mesh = initTarget(model, props);

    this.physicBody = initPhysicBody()

    this.sign = createInteractivitySign()

    this.sign.mesh.position.y = 7.5

    this.mesh.add(this.sign.mesh)

    this.cube = initCube();
    this.mesh.add(this.cube)

    correctionPhysicBody(this.physicBody, this.mesh)
  }
  update(time: number) {

    const obj = state.objects[this.props.id];
    this.setPosition(obj.position);
  }

  setPosition(position: Partial<Vector3Like>) {
    this.physicBody.position.set(
      position.x || this.physicBody.position.x,
      position.y ? position.y + this.physicY : this.physicBody.position.y,
      position.z || this.physicBody.position.z
    );
  }

  interactWith() {
    const { input } = systems.inputSystem

    clearInterval(this.focusInterval)

    if (!this.focusAnimation) {
      this.sign.setFocused(true)
      this.focusAnimation = true
    }
    if (this.focusAnimation) {
      this.focusInterval = setTimeout(() => {
        this.sign.setFocused(false)
        this.focusAnimation = false
      }, 100)
    }

    if (input.interact) {
      console.log(currentPlayer.id, this.props.id)
      state.setState({ objects: { [currentPlayer.activeObjectId]: { weapon: this.props.id }, [this.props.id]: { position: { x: 0, y: 0, z: -1000000 } } } })
    }

  }
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

function initCube() {
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
  cube.position.y = 0.5

  return cube
}

function initTarget(model: Group<Object3DEventMap>, props: HeroisProps) {
  const target = clone(model);
  target.userData.id = props.id;
  Object.assign(target.position, props.position);
  Object.assign(target.quaternion, props.rotation);

  // TODO: скелетоны scale.multiplyScalar(5);
  target.scale.multiplyScalar(0.05);
  target.updateMatrix();

  target.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;

      o.material.map = new TextureLoader().load(
        `model/${target.name}_Texture.png`
      );
      o.material.needsUpdate = true;
    }
  });
  return target;
}

function initPhysicBody() {
  const physicRadius = 4
  return createPhysicBox({ x: physicRadius, y: PHYSIC_Y * 2, z: physicRadius }, { mass: 0 });
}
