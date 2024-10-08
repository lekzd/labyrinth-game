import { DynamicObject } from "@/types";
import {
  Float32BufferAttribute,
  Mesh,
  Object3D,
  Object3DEventMap,
  PlaneGeometry
} from "three";
import { assign } from "@/utils/assign";
import { frandom, noise, random } from "@/utils/random";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { FoliageMatetial } from "@/materials/foliage";

let material: FoliageMatetial;

const createFoliage = (props: DynamicObject) => {
  const height = random(10, 20);
  const x = Math.floor(props.position.x / 10);
  const y = Math.floor(props.position.z / 10);
  const ground = noise(x / 25, y / 25);
  const shadowPower = ground < -0.6 ? 0 : Math.min(0.95, (ground + 0.5) * 2);

  if (!material) {
    material = new FoliageMatetial();
  }

  const geometries = [
    new PlaneGeometry(height, height).rotateY(Math.PI / 4),
    new PlaneGeometry(height, height).rotateY((Math.PI / 4) * 3)
  ];

  const geometry = BufferGeometryUtils.mergeGeometries(geometries);

  // Получаем количество вершин
  const vertexCount = geometry.attributes.position.count;

  // Создаем массив для атрибута с корректной длиной
  const shadowPowerArray = new Float32Array(vertexCount).fill(
    shadowPower
  );

  // Задаем атрибут
  geometry.setAttribute(
    "a_shadowPower",
    new Float32BufferAttribute(shadowPowerArray, 1)
  );

  geometry.rotateZ(frandom(-Math.PI / 6, Math.PI / 6));
  geometry.rotateX(frandom(-Math.PI / 6, Math.PI / 6));
  geometry.rotateY(frandom(-Math.PI / 6, Math.PI / 6));
  geometry.translate(0, height >> 2, 0);

  const mesh = new Mesh(geometry, material);

  return mesh;
};

export class Foliage {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  readonly physicY = 0;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createFoliage(props);
    assign(this.mesh.position, props.position);
  }
  update(timeDelta: number) {}
}
