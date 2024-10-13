import * as CANNON from "cannon";
import { createPhysicBox, physicWorld } from "@/cannon";
import { CSG } from 'three-csg-ts';
import {
  Color,
  InstancedMesh,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Object3DEventMap,
  PointLight,
  Vector2,
  CylinderGeometry,
  Matrix4,
  MeshBasicMaterial,
  BoxGeometry,
  MeshStandardMaterial,
  ConeGeometry,
  Vector3,
  CanvasTexture,
} from "three";
import { DynamicObject } from "@/types";
import { MagicTreePointsMaterial } from "@/materials/magicTreePoints";
import { PineMatetial } from "@/materials/pine";
import {assign} from "@/utils/assign.ts";

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

const getPhisic = (mesh) => {
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

  // Использование с Three.js
  const woodTexture = generateWoodTexture(100, 512, 512); // Задайте ваши размеры

  return new MeshStandardMaterial({
    map: woodTexture,
  });
}

const createMesh = () => {
  // Создание материала для пня
  const material =  new PineMatetial(1.6, 8); // Коричневый цвет коры

  const width = 50, s = 10;

  // Создание цилиндра для основы пня
  const cylinderGeometry = new CylinderGeometry(width, width, 200, 200);

  let stump = new Mesh(cylinderGeometry, material);

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
      remove(stump, path),
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
  stump.add(intersect(diagonal, inner));

  // Создание корней с помощью конусов
  function createRoot(x, z, angle) {
    const rootGeometry = new ConeGeometry(1, 5, 32);
    const root = new Mesh(rootGeometry, material);
    root.position.set(x, -5, z);
    root.rotation.z = angle;
    stump.add(root);
  }

  // Добавляем несколько корней
  createRoot(6, 0, Math.PI / 4);
  createRoot(-6, 0, -Math.PI / 4);
  createRoot(0, 6, Math.PI / 4);
  createRoot(0, -6, -Math.PI / 4);


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

    assign(this.mesh.position, props.position);
    this.physicBody = initPhysicBody(props, 20, 45, 15);

    this.physicBody.position.set(
      props.position.x,
      props.position.y,
      props.position.z
    );
  }
  update(timeDelta: number) {
    // this.particleMaterial.uniforms.time.value += timeDelta * 2;
  }
}
