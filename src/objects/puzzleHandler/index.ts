import * as CANNON from "cannon";
import { BoxGeometry, Mesh, MeshPhongMaterial, Object3DEventMap } from "three";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { loads } from "@/loader";

import { createInteractivitySign } from "@/utils/interactivitySign.ts";
import { createPhysicBox } from "@/cannon";
import { systems } from "@/systems";
import { DynamicObject } from "@/types";
import { state } from "@/state";

const PHYSIC_Y = 4;
export class PuzzleHandler {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = PHYSIC_Y;

  private focusInterval = 0;
  private focusAnimation = false;
  private busyOnInteraction = false;
  sign: {
    mesh: Mesh<THREE.ConeGeometry, THREE.ShaderMaterial, Object3DEventMap>;
    setFocused: (value: boolean) => void;
  };
  cube: Mesh<BoxGeometry, THREE.MeshLambertMaterial[], Object3DEventMap>;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = initMesh(props);
    this.physicBody = initPhysicBody();

    this.sign = createInteractivitySign();

    this.sign.mesh.position.y = 7.5;

    this.mesh.add(this.sign.mesh);

    this.cube = initCube();
    this.mesh.add(this.cube);
  }
  update(time: number) {
    const obj = state.objects[this.props.id];
    this.setPosition(obj.position);
  }

  setPosition(position: Partial<THREE.Vector3Like>) {
    this.physicBody.position.set(
      position.x || this.physicBody.position.x,
      position.y ? position.y + this.physicY : this.physicBody.position.y,
      position.z || this.physicBody.position.z
    );
  }

  interactWith() {
    const { input } = systems.inputSystem;

    clearInterval(this.focusInterval);

    if (!this.focusAnimation) {
      this.sign.setFocused(true);
      this.focusAnimation = true;
    }
    if (this.focusAnimation) {
      this.focusInterval = setTimeout(() => {
        this.sign.setFocused(false);
        this.focusAnimation = false;
      }, 100);
    }

    if (!this.busyOnInteraction && input.interact) {
      new TWEEN.Tween(this.cube.rotation)
        .to({ y: this.cube.rotation.y + Math.PI / 2 }, 700)
        .start();

      setTimeout(() => {
        this.busyOnInteraction = false;
      }, 1000);
      this.busyOnInteraction = true;
    }
  }
}

function initCube() {
  const runicTexture = loads.texture["runic_2.png"]?.clone()!;
  runicTexture.wrapS = THREE.RepeatWrapping;
  runicTexture.wrapT = THREE.RepeatWrapping;

  runicTexture.repeat = new THREE.Vector2(1 / 4, 1 / 3);

  const materials: THREE.MeshLambertMaterial[] = [];

  const coordsMap = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 2 },
  ];

  for (let i = 0; i < 6; i++) {
    const map = loads.texture["runic_2.png"]?.clone()!;
    const { x, y } = coordsMap[i];

    map.repeat = new THREE.Vector2(1 / 4, 1 / 3);
    map.offset = new THREE.Vector2((1 / 4) * x, (1 / 3) * y);

    materials.push(new THREE.MeshLambertMaterial({ map }));
  }

  const cube = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), materials);

  cube.castShadow = true;
  cube.receiveShadow = true;
  cube.position.y = 0.5;

  return cube;
}

function initMesh(props: DynamicObject) {
  const target = new THREE.Group();

  target.name = "PuzzleHandler";

  Object.assign(target.position, props.position);
  Object.assign(target.quaternion, props.rotation);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1, 10),
    new THREE.MeshPhongMaterial({ color: 0xff0000 })
  );

  base.receiveShadow = true;

  base.position.y = -3;

  target.add(base);

  return target;
}

function initPhysicBody() {
  const physicRadius = 4;
  return createPhysicBox(
    { x: physicRadius, y: PHYSIC_Y * 2, z: physicRadius },
    { mass: 0 }
  );
}
