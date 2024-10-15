import * as CANNON from "cannon";
import { createPhysicBox, physicWorld } from "@/cannon";
import { CSG } from 'three-csg-ts';
import {
  Color,
  InstancedMesh,
  CatmullRomCurve3,
  DoubleSide,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Object3DEventMap,
  PointLight,
  Vector2,
  Group,
  CylinderGeometry,
  Matrix4,
  MeshBasicMaterial,
  BoxGeometry,
  MeshStandardMaterial,
  ConeGeometry,
  Vector3,
  TubeGeometry,
  BufferGeometry,
  BufferAttribute,
  CanvasTexture,
} from "three";
import { DynamicObject } from "@/types";
import { MagicTreePointsMaterial } from "@/materials/magicTreePoints";
import { PineMatetial } from "@/materials/pine";
import {assign} from "@/utils/assign.ts";
import {StumpPointsMaterial} from "@/materials/stumpPoints";
import {ParticleSystem} from "@/objects/common/ParticleSystem.ts";
import {Shine} from "@/objects/common/Shine.ts";
import {CustomTubeGeometry} from "@/objects/tree/CustomTubeGeometry.ts";
import {radiusFunction} from "@/objects/tree";

function initPhysicBody(props, count, radius, del = 0) {
  const stoneShape = new CANNON.Box(new CANNON.Vec3(11, 30, 11));

  const boxBody = new CANNON.Body({mass: 0, type: CANNON.Body.STATIC});

  boxBody.position.set(props.position.x, 0, props.position.z);

  for (let i = 0; i < count; i++) {
    if (i === del) {
      console.log('Skip', del)
      continue;
    }
    const angle = (i * Math.PI * 2) / (count);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    boxBody.addShape(stoneShape, new CANNON.Vec3(x, 0, z));
  }

  return boxBody;
}

const remove = (from, to) => {
  const cylinderCSG = CSG.fromMesh(from);
  const cutBoxCSG = CSG.fromMesh(to);
  const subResultCSG = cylinderCSG.subtract(cutBoxCSG);
  from = CSG.toMesh(subResultCSG, new Matrix4(), from.material);

  return from;
}

const intersect = (from, to) => {
  return CSG.toMesh(
    CSG.fromMesh(from)
      .intersect(
        CSG.fromMesh(to)
      ),
    new Matrix4(),
    from.material,
  )
}

const innerTreeMaterial = () => {
  function generateWoodTexture(radius, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    context.fillStyle = '#8B4513'; // Основной цвет древесины
    context.fillRect(0, 0, width, height);

    // Рисуем кольца
    const numberOfRings = Math.floor(radius / 10) + Math.floor(Math.random() * 5); // Количество колец, включая случайность
    for (let i = 0; i < numberOfRings; i++) {
      const ringRadius = (i + 1) * (radius / numberOfRings) * (0.9 + Math.random() * 0.2);

      // Генерация цвета для каждого нового кольца
      const sprinkle = Math.floor(Math.random() * 40) - 20;
      const colorValue = 139 + sprinkle; // Смещение основного цвета
      context.strokeStyle = `rgb(${colorValue}, ${70 + sprinkle}, ${19 + sprinkle})`;

      context.lineWidth = Math.floor(Math.random() * 3) + 1; // Разная толщина линий
      context.beginPath();
      context.arc(width / 2, height / 2, ringRadius, 0, Math.PI * 2);
      context.stroke();
    }

    return new CanvasTexture(canvas);
  }

  // Использование с js
  const woodTexture = generateWoodTexture(100, 512, 512); // Задайте ваши размеры

  return new MeshStandardMaterial({
    map: woodTexture,
  });
}

function createWedge(width = 10, height = 100, depth =80, color = 0x00ff00, wireframe = false) {
  // Определяем вершины клина относительно центра
  const vertices = new Float32Array([
    // Нижняя грань (треугольник)
    0, 0, 0,              // Вершина A
    width, 0, 0,          // Вершина B
    0, 0, depth,          // Вершина C

    // Верхняя грань (треугольник)
    0, height, 0,         // Вершина D
    width, height, 0,     // Вершина E
    0, height, depth      // Вершина F
  ]);

  // Определяем индексы граней клина
  const indices = [
    // Нижняя грань
    0, 1, 2,

    // Верхняя грань
    3, 5, 4,

    // Боковые грани
    0, 3, 1,
    1, 3, 4,

    1, 4, 2,
    2, 4, 5,

    2, 5, 0,
    0, 5, 3
  ];

  // Создаем BufferGeometry и наполняем её данными
  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new BufferAttribute(vertices, 3));

  geometry.computeVertexNormals();

  // Создаем материал
  const material = new MeshBasicMaterial({ color: color, wireframe: wireframe });

  // Создаем меш на основе геометрии и материала
  const wedge = new Mesh(geometry, material);

  return wedge;
}

const createRoots = (stump, { numRoots = 5, rootLength = 50, y = 0, rootWidth = 4, stumpRadius = 50 }) => {
  const roots = new Group(); // Создаем группу для корней

  const material = new MeshPhongMaterial({
    ...stump.material,
    side: DoubleSide
  });

  for (let i = 0; i < numRoots; i++) {
    // Генерируем случайные контрольные точки для кривой
    const points = [];
    points.push(new Vector3(0, 0, 0)); // Начало корня будет на уровне земли

    for (let j = 0; j < 4; j++) {
      const x = Math.random() * rootLength - rootLength / 2;
      // const y = Math.random() * 10 + 5; // Наблюдается небольшое возвышение от земли
      const z = Math.random() * rootLength - rootLength / 2;
      points.push(new Vector3(x, y, z));
    }

    // Создаем кривую CatmullRom
    const curve = new CatmullRomCurve3(points);

    // Создаем геометрию для кривой
    const tubeGeometry = new CustomTubeGeometry(
      curve,
      20,
      radiusFunction(rootWidth, 1),
      6,
      true
    );

    const rootMesh = new Mesh(tubeGeometry, material);

    // Размещаем корни вокруг пня. Смещение корней
    const angle = (i / numRoots) * Math.PI * 2; // Угол в радианах для размещения по кругу
    rootMesh.position.x = Math.cos(angle) * (stumpRadius + rootWidth);
    rootMesh.position.z = Math.sin(angle) * (stumpRadius + rootWidth);
    rootMesh.rotation.y = angle;

    roots.add(rootMesh);
  }

  return roots;
}


const createMesh = () => {
  // Создание материала для пня
  const material =  new PineMatetial(1.6, 8); // Коричневый цвет коры

  const width = 50, s = 10;

  // Создание цилиндра для основы пня
  const cylinderGeometry = new CylinderGeometry(width, width, 200, 200);

  let stump = new Mesh(cylinderGeometry, material);

  const klin = createWedge();

  klin.position.z = -50;
  klin.position.x = -3;
  klin.updateMatrix();

  let diagonal = new Mesh(new BoxGeometry(width * 3, width * 3, 70));
  diagonal.rotation.x = Math.PI / 3; // Повернем на 45 градусов
  diagonal.position.y = 100;
  diagonal.updateMatrix();

  const inner = new Mesh(new CylinderGeometry(width - s, width - s, 200, 200), material);

  const path = new Mesh(new BoxGeometry(6, 81, 22));
  path.position.x = 0;
  path.position.z = -1 * width;
  path.updateMatrix();

  stump = remove(
    remove(
      remove(stump, klin),
      inner
    ),
    diagonal
  );

  // Пересоздаем диагональ и опускаем ее, из нее получится крышка
  diagonal = new Mesh(new BoxGeometry(width * 3, width * 3, 3));
  diagonal.rotation.x = Math.PI / 3; // Повернем на 45 градусов
  diagonal.position.y = 55;
  diagonal.material = innerTreeMaterial();
  diagonal.updateMatrix();

  // Крышечка у пня
  stump.add(
    remove(
      intersect(diagonal, inner),
      klin
    )
  );

  return stump;
}

export class Stump {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = 0;
  particleMaterial: MagicTreePointsMaterial;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createMesh();

    this.mesh.add(createRoots(this.mesh, { numRoots: 10, y: -1, rootLength: 150, rootWidth: 3   }))
    this.mesh.add(createRoots(this.mesh, { numRoots: 6, y: 5, rootLength: 50, rootWidth: 5 }))
    this.mesh.add(createRoots(this.mesh, { numRoots: 2, y: 2, rootLength: 30, rootWidth: 7  }))

    this.particleMaterial = new StumpPointsMaterial({
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

    const shine = Shine({ color: new Color("rgb(0,99,73)") });
    shine.position.y = 20;
    shine.scale.set(150, 150, 70);

    this.mesh.add(shine);
    this.mesh.add(particleSystem);

    assign(this.mesh.position, props.position);
    this.physicBody = initPhysicBody(props, 20, 45, 15);

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
