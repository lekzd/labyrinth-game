import * as CANNON from "cannon";
import { createBranch, createBranchGeometry } from ".";
import { createPhysicBox, physicWorld } from "@/cannon";
import {
  Color,
  InstancedMesh,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Object3DEventMap,
  PointLight,
  Vector2,
  Vector3,
} from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { DynamicObject, HeroProps } from "@/types";
import { shadowSetter } from "@/utils/shadowSetter";
import { loads } from "@/loader";
import { MagicTreePointsMaterial } from "@/materials/magicTreePoints";
import { textureRepeat } from "@/utils/textureRepeat";
import { createMatrix } from "@/utils/createMatrix";
import { PineMatetial } from "@/materials/pine";
import { ParticleSystem } from "../common/ParticleSystem";
import { Shine } from "../common/Shine";
import {assign} from "@/utils/assign.ts";

const Torch = () => {
  const torch = new PointLight(new Color("rgb(241, 48, 216)"), 5000, 100, 1); // Цвет, интенсивность, дистанция факела
  torch.position.set(0, 20, 0);
  torch.shadow.mapSize.width = 100;
  torch.shadow.mapSize.height = 100;
  torch.shadow.camera.near = 5;
  torch.shadow.camera.far = 25;

  shadowSetter(torch, {
    castShadow: true
  });

  setTimeout(() => {
    torch.shadow.autoUpdate = false;
  }, 1000);

  return torch;
};

function initPhysicBody() {
  const physicRadius = 4;
  return createPhysicBox(
    { x: physicRadius, y: 30, z: physicRadius },
    { mass: 0, type: CANNON.Body.STATIC }
  );
}

export const createMagicTree = () => {
  const branches = createBranch(2, 5, 20);
  const branchGeometries = branches.map(createBranchGeometry);

  const woodGeometry = BufferGeometryUtils.mergeGeometries(branchGeometries);

  const material = new MeshPhongMaterial({
    color: new Color("#ef19bd"),
    side: 0,
    shininess: 1,
    map: textureRepeat(
      loads.texture["Bark_06_basecolor.jpg"]!,
      2,
      1,
      1,
      2,
      Math.PI / 2
    ),
    normalMap: textureRepeat(
      loads.texture["Bark_06_normal.jpg"]!,
      2,
      1,
      1,
      2,
      Math.PI / 2
    ),
    normalScale: new Vector2(5, 5)
  });

  const mesh = new Mesh(woodGeometry, material);

  return mesh;
};

const Altar = (props: DynamicObject) => {
  const count = 24;
  const radius = 100;
  const branches = createBranch(3, 5, 20);
  const branchGeometries = branches.map(createBranchGeometry);

  const geometry = BufferGeometryUtils.mergeGeometries(branchGeometries);

  geometry.rotateX(-Math.PI / 12);

  const stoneShape = new CANNON.Box(new CANNON.Vec3(11, 30, 11));

  const material = new PineMatetial(10, 20);

  const instanceNumber = count;

  const instancedMesh = new InstancedMesh(geometry, material, instanceNumber);

  const boxBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });

  boxBody.position.set(props.position.x, 0, props.position.z);

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / (count + 2);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const matrix = createMatrix({
      translation: {
        x,
        y: -10,
        z
      },
      rotation: {
        y: -angle + Math.PI / 2
      },
      scale: {
        x: 5,
        y: 5,
        z: 5
      }
    });

    boxBody.addShape(stoneShape, new CANNON.Vec3(x, 0, z));

    instancedMesh.setMatrixAt(i, matrix);
  }

  physicWorld.addBody(boxBody);

  return instancedMesh;
};

export class MagicTree {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = 0;
  particleMaterial: MagicTreePointsMaterial;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createMagicTree();
    this.particleMaterial = new MagicTreePointsMaterial({
      time: { value: 0.0 }
    });
    const particleSystem = ParticleSystem({
      count: 500,
      material: this.particleMaterial,
      x: [-50, 50],
      y: [0, 50],
      z: [-50, 50],
      size: [0.1, 10],
      speed: [0.1, 1]
    });

    particleSystem.position.y = 3;

    const shine = Shine({ color: new Color("rgb(241, 48, 216)") });
    shine.position.y = 20;
    shine.scale.set(50, 50, 30);

    this.mesh.add(shine);
    this.mesh.add(Torch());
    this.mesh.add(Altar(props));
    this.mesh.add(particleSystem);

    assign(this.mesh.position, props.position);
    this.physicBody = initPhysicBody();

    this.physicBody.position.set(
      props.position.x,
      props.position.y,
      props.position.z
    );
  }
  update(timeDelta: number) {
    this.particleMaterial.uniforms.time.value += timeDelta * 2;
  }

  hit(by: HeroProps, point: Vector3) {
    if (this.props.onHit) {
      this.props.onHit(by);
    }
  }
}
