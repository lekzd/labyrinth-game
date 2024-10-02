import { DynamicObject } from "@/types";
import { Color, DoubleSide, Mesh, MeshPhongMaterial, Object3D, Object3DEventMap, PlaneGeometry } from "three";
import { assign } from "@/utils/assign";
import { frandom, random } from "@/utils/random";
import { loads } from "@/loader";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";

const createFoliage = () => {
  const height = random(10, 20);
  const baseColor = new Color(`#344a20`).offsetHSL(
    frandom(-0.1, 0.1),
    frandom(-0.1, 0.1),
    frandom(-0.01, 0.01)
  );
  const material = new MeshPhongMaterial({
    color: baseColor,
    map: loads.texture["foliage.jpg"],
    alphaMap: loads.texture["foliage_mask.jpg"],
    alphaTest: 0.8,
    side: DoubleSide
  });

  const geometries = [
    new PlaneGeometry(height, height).rotateY(Math.PI / 4),
    new PlaneGeometry(height, height).rotateY((Math.PI / 4) * 3)
  ];

  const geometry = BufferGeometryUtils.mergeGeometries(geometries);

  geometry.rotateZ(frandom(-Math.PI / 6, Math.PI / 6));
  geometry.rotateX(frandom(-Math.PI / 6, Math.PI / 6));
  geometry.rotateY(frandom(-Math.PI / 6, Math.PI / 6));
  geometry.translate(0, height >> 2, 0);

  const mesh = new Mesh(
    geometry,
    material
  );

  return mesh;
};

export class Foliage {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  readonly physicY = 0;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createFoliage();
    assign(this.mesh.position, props.position);
  }
  update(timeDelta: number) {}
}
