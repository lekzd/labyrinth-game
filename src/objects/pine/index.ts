import { DynamicObject } from "@/types";
import {
  ConeGeometry,
  CylinderGeometry,
  Mesh,
  Object3D,
  Object3DEventMap,
} from "three";
import { assign } from "@/utils/assign";
import { frandom } from "@/utils/random";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { jitterGeometry } from "@/utils/jitterGeometry";
import { rotateUvs } from "@/utils/rotateUvs";
import { PineMatetial } from "@/materials/pine";
import { StaticPhysicEntity } from "../entities/StaticPhysicEntity";

let material: PineMatetial;

const createPine = () => {
  if (!material) {
    material = new PineMatetial(1.6, 8);
  }

  const radius = frandom(4, 8);
  const base = jitterGeometry(
    rotateUvs(new ConeGeometry(radius * 2, radius * 10, 40)),
    5
  );
  base.translate(0, radius * 4, 0);

  const geometry = new CylinderGeometry(radius, radius, 300, 16);

  geometry.translate(0, 150, 0);

  const mesh = new Mesh(
    BufferGeometryUtils.mergeGeometries([base, geometry]),
    material
  );

  return mesh;
};

export class Pine {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  physicEntity: StaticPhysicEntity;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createPine();
    assign(this.mesh.position, props.position);

    this.physicEntity = new StaticPhysicEntity({
      target: this.mesh,
      physicY: 30,
      physicRadius: 5,
    });
  }
  update(timeDelta: number) {}
}
