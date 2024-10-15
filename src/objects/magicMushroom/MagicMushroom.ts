import * as CANNON from "cannon";
import { createPhysicBox } from "@/cannon";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Object3D,
  Object3DEventMap,
  PointLight,
  SphereGeometry,
  Vector2,
  Vector3
} from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { DynamicObject, HeroProps } from "@/types";
import { shadowSetter } from "@/utils/shadowSetter";
import { loads } from "@/loader";
import { textureRepeat } from "@/utils/textureRepeat";
import { ParticleSystem } from "../common/ParticleSystem";
import { Shine } from "../common/Shine";
import { assign } from "@/utils/assign.ts";
import { createBranch, createBranchGeometry } from "../tree";
import { jitterGeometry } from "@/utils/jitterGeometry";
import { MagicMushroomPointsMaterial } from "@/materials/magicMushroomPoints";

const Torch = () => {
  const torch = new PointLight(new Color("rgb(77, 241, 48)"), 1000, 100, 1); // Цвет, интенсивность, дистанция факела

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

const MushroomCap = () => {
  const mesh = new Object3D();
  // Создание шляпки гриба
  const capGeometry = new SphereGeometry(50, 30, 30, 0, Math.PI * 2, 0, 1.1);

  const capMaterial = new MeshStandardMaterial({
    color: new Color("#554c35"),
    side: DoubleSide,
    flatShading: true,
    normalMap: textureRepeat(
      loads.texture["Bark_06_normal.jpg"]!,
      1,
      1,
      0.1,
      0.1,
      Math.PI / 2
    )
  });
  const capMesh = new Mesh(capGeometry, capMaterial);
  const capBottom = new Mesh(jitterGeometry(capGeometry, 2), capMaterial);

  capBottom.scale.set(1, 0.2, 1);

  capMesh.position.y = 25;
  capBottom.position.y = 52.5;
  capBottom.rotation.x = Math.PI;

  mesh.add(capMesh, capBottom);

  return mesh;
};

export const createMagicMushroom = () => {
  const branches = createBranch(3, 0, 20);
  const branchGeometries = branches.map(createBranchGeometry);

  const woodGeometry = BufferGeometryUtils.mergeGeometries(branchGeometries);

  woodGeometry.scale(3, 3, 3);
  woodGeometry.translate(0, -10, 0);

  const material = new MeshPhongMaterial({
    color: new Color("#667162"),
    side: 0,
    shininess: 1,
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
  const lightMesh = new Mesh(
    woodGeometry,
    new MeshBasicMaterial({
      color: new Color("rgb(77, 241, 48)"),
      transparent: true,
      opacity: 0.6,
      side: DoubleSide,
      blending: AdditiveBlending
    })
  );

  lightMesh.scale.set(1.1, 1, 1.1);

  mesh.add(MushroomCap());
  mesh.add(lightMesh);

  return mesh;
};

export class MagicMushroom {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = 0;
  particleMaterial: MagicMushroomPointsMaterial;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createMagicMushroom();
    this.particleMaterial = new MagicMushroomPointsMaterial({
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

    const shine = Shine({ color: new Color("rgb(74, 241, 48)") });
    shine.position.y = 20;
    shine.scale.set(50, 100, 30);

    const torch = Torch();
    torch.position.set(0, 40, 0);

    this.mesh.add(shine);
    this.mesh.add(torch);
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
