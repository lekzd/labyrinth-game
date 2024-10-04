import * as CANNON from "cannon";
import {
  createBranch,
  createBranchGeometry,
  createFoliageGeometry
} from ".";
import { createPhysicBox } from "@/cannon";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Object3DEventMap,
  PointLight,
  Points,
  RepeatWrapping,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector2
} from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { LeavesMatetial } from "@/materials/leaves";
import { DynamicObject } from "@/types";
import { assign } from "lodash";
import { shadowSetter } from "@/utils/shadowSetter";
import { loads } from "@/loader";
import { ParticlesMaterial } from "@/materials/particles";
import { frandom } from "@/utils/random";
import { MagicTreePointsMaterial } from "@/materials/magicTreePoints";

const PARTICLE_COUNT = 100;

const ParticleSystem = (particleMaterial: ParticlesMaterial) => {
  // Создание массивов для хранения позиций частиц
  const positions = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
  const indexes = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = frandom(-10, 10); // Рандомное положение частицы по оси X
    positions[i + 1] = frandom(0, 30); // Рандомное положение частицы по оси Y
    positions[i + 2] = frandom(-10, 10); // Рандомное положение частицы по оси Z

    indexes[i] = i / positions.length;
    indexes[i + 1] = frandom(0.1, 1);
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
  const torch = new PointLight(new Color("rgb(241, 48, 216)"), 100000, 100); // Цвет, интенсивность, дистанция факела
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

  const foliageGeometries = branches.slice(1).map(createFoliageGeometry).flat();
  const croneGeometry = BufferGeometryUtils.mergeGeometries(foliageGeometries);

  const prepareTexture = (texture: Texture) => {
    const map = texture.clone();
    map.rotation = Math.PI / 2;
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat = new Vector2(0.5, 2);

    return map;
  };

  const material = new MeshPhongMaterial({
    color: new Color("#ef19bd"),
    side: 0,
    shininess: 1,
    map: prepareTexture(loads.texture["Bark_06_basecolor.jpg"]!),
    normalMap: prepareTexture(loads.texture["Bark_06_normal.jpg"]!),
    normalScale: new Vector2(5, 5)
  });

  const mesh = new Mesh(woodGeometry, material);
  const foliage = new Mesh(croneGeometry, new LeavesMatetial());

  // mesh.add(foliage);

  return mesh;
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
      time: { value: 0.0 },
    });
    const particleSystem = ParticleSystem(this.particleMaterial);

    this.mesh.add(Torch());
    this.mesh.add(Shine());
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
