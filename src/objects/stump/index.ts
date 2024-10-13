import * as CANNON from "cannon";
import * as THREE from "three";
import { CSG } from 'three-csg-ts';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';



import { DynamicObject } from "@/types";
import { Object3D, Object3DEventMap } from "three";
import { createStone } from "./stone";
import { assign } from "@/utils/assign";
import { createPhysicBox } from "@/cannon";
import {loads} from "@/loader.ts";
import {createTree} from "@/objects/tree";

function initPhysicBody() {
  const physicRadius = 6;
  return createPhysicBox(
    { x: physicRadius, y: 30, z: physicRadius },
    { mass: 0, type: CANNON.Body.STATIC }
  );
}

const createMesh = (size = 10) => {
  // Определяем количество объектов и радиус окружности
  const numberOfObjects = 10;
  const radius = 5;];


  const mesh = new THREE.Mesh();

// Создаем боксы и добавляем их геометрию в общий массив
  const boxGeometry = createTree();

  for (let i = 0; i < numberOfObjects; i++) {
    const angle = (i / numberOfObjects) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Клонируем геометрию бокса
    const instanceGeometry = boxGeometry.clone();

    // Создаем матрицу для перемещения
    const translationMatrix = new THREE.Matrix4().makeTranslation(x, 0, z);

    // Применяем матрицу к геометрии
    instanceGeometry.applyMatrix4(translationMatrix);

    // Добавляем в массив
    mesh.add(instanceGeometry);
  }

// Создаем один общий меш и добавляем на сцену
  return mesh
}

export class Stump {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = 0;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createMesh();
    assign(this.mesh.position, props.position);
    this.physicBody = initPhysicBody();

    this.physicBody.position.set(
      props.position.x,
      props.position.y,
      props.position.z
    );
  }
  update(timeDelta: number) {}
}
