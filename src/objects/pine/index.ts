import * as CANNON from "cannon";
import { DynamicObject } from "@/types";
import {
  ConeGeometry,
  CylinderGeometry,
  Mesh,
  Object3D,
  Object3DEventMap,
} from "three";
import { assign } from "@/utils/assign";
import { createPhysicBox } from "@/cannon";
import { frandom } from "@/utils/random";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { jitterGeometry } from "@/utils/jitterGeometry";
import { rotateUvs } from "@/utils/rotateUvs";
import { PineMatetial } from "@/materials/pine";

function initPhysicBody() {
  const physicRadius = 10;
  return createPhysicBox(
    { x: physicRadius, y: 30, z: physicRadius },
    { mass: 0, type: CANNON.Body.STATIC }
  );
}

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
  readonly physicBody: CANNON.Body;
  readonly physicY = 0;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = createPine();
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
