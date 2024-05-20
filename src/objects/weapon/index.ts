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

    this.sign.mesh.position.y = 12

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

const weaponMaterial = new THREE.ShaderMaterial({
  uniforms: {
      color: { value: new THREE.Color(0xffff00) },
      radius: { value: 5 }
  },
  vertexShader: `
      void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `,
  fragmentShader: `
      uniform vec3 color;
      void main() {
          gl_FragColor = vec4(color, 0.5);
      }
  `,
  transparent: true,
  side: 2,
});

const glowMaterial = new THREE.ShaderMaterial({
  uniforms: {
      color: { value: new THREE.Color(0xffff00) },
      radius: { value: 5 }
  },
  vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `,
  fragmentShader: `
      uniform vec3 color;
      uniform float radius;
      varying vec2 vUv;
      void main() {
          float dist = length(vUv - vec2(0.5, 0.5)) * 2.0;
          float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
          gl_FragColor = vec4(color, alpha);
      }
  `,
  transparent: true,
  side: 2,
});

function initCube() {
  const geometry = new THREE.CircleGeometry(5, 64);

  const glowMesh = new THREE.Mesh(geometry, glowMaterial);
  glowMesh.position.y = -3.9
  glowMesh.rotation.x = -Math.PI / 2;

  return glowMesh
}

function initTarget(model: Group<Object3DEventMap>, props: HeroisProps) {
  const containner = new THREE.Object3D()
  const target = clone(model);
  target.userData.id = props.id;
  Object.assign(containner.position, props.position);
  Object.assign(containner.quaternion, props.rotation);

  // TODO: скелетоны scale.multiplyScalar(5);
  target.scale.multiplyScalar(0.05);
  target.updateMatrix();
  containner.updateMatrix();

  target.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;

      o.material = weaponMaterial

      // o.material.wireframe = true
      // o.material.color = 0xFFcc00

      // o.material.map = new TextureLoader().load(
      //   `model/${target.name}_Texture.png`
      // );
      o.material.needsUpdate = true;
    }
  });
  containner.add(target)
  return containner;
}

function initPhysicBody() {
  const physicRadius = 4
  return createPhysicBox({ x: physicRadius, y: PHYSIC_Y * 2, z: physicRadius }, { mass: 0 });
}
