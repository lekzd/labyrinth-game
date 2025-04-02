import {
  BoxGeometry,
  Group,
  Mesh,
  MeshPhongMaterial,
  Object3DEventMap
} from "three";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { loads } from "@/loader";
import { DynamicObject } from "@/types";
import { createInteractivitySign } from "@/utils/interactivitySign";
import { currentPlayer } from "@/main.ts";
import { state } from "@/state.ts";
import { GlowMaterial } from "@/materials/glow/index.ts";
import { HeroProps } from "@/types";
import { StaticPhysicEntity } from "@/entities/StaticPhysicEntity";

export class Weapon {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;

  sign: {
    mesh: Mesh<THREE.ConeGeometry, THREE.ShaderMaterial, Object3DEventMap>;
    setFocused: (value: boolean) => void;
  };
  cube: Mesh<BoxGeometry, THREE.MeshLambertMaterial[], Object3DEventMap>;
  physicEntity: StaticPhysicEntity;

  constructor(props: DynamicObject) {
    const model = loads.weapon_glb[props.type];

    if (!model) {
      throw Error(`No model with type "${props.type}"`);
    }

    this.props = props;
    this.mesh = initTarget(model, props);

    this.physicEntity = new StaticPhysicEntity({
      target: this.mesh,
      physicY: 30,
      physicRadius: 4,
    });

    this.sign = createInteractivitySign();

    this.sign.mesh.position.y = 12;

    this.mesh.add(this.sign.mesh);

    this.cube = initCube();
    this.mesh.add(this.cube);
  }
  update(time: number) {}

  setFocus(value: boolean) {
    this.sign.setFocused(value);
  }

  interactWith(value: boolean) {
    if (value) {
      state.setState({
        objects: {
          [currentPlayer.activeObjectId]: { weapon: this.props.type },
          [this.props.id]: { position: { x: 0, y: 0, z: -1000000 } }
        }
      });

      this.physicEntity.setPosition({ x: 0, y: 0, z: -1000000 });
    }
  }
}

const weaponMaterial = new GlowMaterial({ type: "opaque", opacity: 0.5 });
const glowMaterial = new GlowMaterial({ type: "gradient", opacity: 1 });

function initCube() {
  const geometry = new THREE.CircleGeometry(5, 64);

  const glowMesh = new THREE.Mesh(geometry, glowMaterial);
  glowMesh.position.y = -3.9;
  glowMesh.rotation.x = -Math.PI / 2;

  return glowMesh;
}

function initTarget(model: Group<Object3DEventMap>, props: HeroProps) {
  const containner = new THREE.Object3D();
  const target = clone(model);
  target.userData.id = props.id;
  Object.assign(containner.position, props.position);
  Object.assign(containner.quaternion, props.rotation);

  target.rotateZ(-Math.PI / 2);
  target.scale.multiplyScalar(5);
  target.updateMatrix();
  containner.updateMatrix();

  target.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;

      o.material = weaponMaterial;

      o.material.needsUpdate = true;
    }
  });
  containner.add(target);
  return containner;
}
