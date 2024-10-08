import * as CANNON from "cannon";
import { createBranch, createBranchGeometry } from ".";
import { createPhysicBox, physicWorld } from "@/cannon";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedMesh,
  Mesh,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Object3D,
  Object3DEventMap,
  PointLight,
  Points,
  Sprite,
  SpriteMaterial,
  Vector2
} from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { DynamicObject } from "@/types";
import { assign } from "lodash";
import { shadowSetter } from "@/utils/shadowSetter";
import { loads } from "@/loader";
import { ParticlesMaterial } from "@/materials/particles";
import { frandom } from "@/utils/random";
import { MagicTreePointsMaterial } from "@/materials/magicTreePoints";
import { textureRepeat } from "@/utils/textureRepeat";
import { createMatrix } from "@/utils/createMatrix";
import { PineMatetial } from "@/materials/pine";

const PARTICLE_COUNT = 500;

const ParticleSystem = (particleMaterial: ParticlesMaterial) => {
  // Создание массивов для хранения позиций частиц
  const positions = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
  const indexes = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = frandom(-50, 50); // Рандомное положение частицы по оси X
    positions[i + 1] = frandom(0, 50); // Рандомное положение частицы по оси Y
    positions[i + 2] = frandom(-50, 50); // Рандомное положение частицы по оси Z

    indexes[i] = i / positions.length;
    indexes[i + 1] = frandom(0.1, 10);
    indexes[i + 2] = frandom(0.1, 1);
  }
  // Создание буферной геометрии для частиц
  const particleGeometry = new BufferGeometry();
  particleGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  particleGeometry.setAttribute("values", new BufferAttribute(indexes, 3));

  const particleSystem = new Points(particleGeometry, particleMaterial);

  particleSystem.position.y = 3;

  return particleSystem;
};

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

const Shine = () => {
  const shine = new Sprite(
    new SpriteMaterial({
      map: loads.texture["dot.png"],
      color: new Color("rgb(241, 48, 216)"),
      opacity: 0.5
    })
  );

  shine.position.y = 20;
  shine.scale.set(50, 50, 30);

  return shine;
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

  const stoneShape = new CANNON.Box(new CANNON.Vec3(5, 30, 5));
  // const material = new MeshStandardMaterial({
  //   color: new Color("rgb(92, 82, 28)"),
  //   metalness: 0,
  //   roughness: 0.8,
  //   map: textureRepeat(
  //     loads.texture["Bark_06_basecolor.jpg"]!,
  //     1,
  //     2,
  //     10,
  //     20,
  //     Math.PI
  //   ),
  //   normalMap: textureRepeat(
  //     loads.texture["Bark_06_normal.jpg"]!,
  //     1,
  //     2,
  //     10,
  //     20,
  //     Math.PI
  //   )
  // });

  const material = new PineMatetial(10, 20);

  const instanceNumber = count;

  const instancedMesh = new InstancedMesh(geometry, material, instanceNumber);

  const boxBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });

  boxBody.position.set(props.position.x, 0, props.position.z);

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count;
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
        x: 4,
        y: 4,
        z: 4
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
    const particleSystem = ParticleSystem(this.particleMaterial);

    this.mesh.add(Torch());
    this.mesh.add(Shine());
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
}
