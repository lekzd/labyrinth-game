import * as CANNON from "cannon";
import { DynamicObject } from "@/types";
import {
  Color,
  CylinderGeometry,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Object3DEventMap,
  Vector2
} from "three";
import { assign } from "@/utils/assign";
import { createPhysicBox } from "@/cannon";
import { textureRepeat } from "@/utils/textureRepeat";
import { loads } from "@/loader";
import { frandom } from "@/utils/random";

function initPhysicBody() {
  const physicRadius = 6;
  return createPhysicBox(
    { x: physicRadius, y: 30, z: physicRadius },
    { mass: 0, type: CANNON.Body.STATIC }
  );
}

const createPine = () => {
  const material = new MeshPhongMaterial({
    color: new Color("#4c3e34"),
    side: 0,
    shininess: 1,
    map: textureRepeat(loads.texture["Bark_06_basecolor.jpg"]!, 1, 1, 1.6, 8),
    normalMap: textureRepeat(
      loads.texture["Bark_06_normal.jpg"]!,
      1,
      1,
      1.6,
      8
    ),
    normalScale: new Vector2(5, 5)
  });

  const radius = frandom(4, 8);
  const geometry = new CylinderGeometry(radius, radius, 300, 16);

  geometry.translate(0, 150, 0);

  const mesh = new Mesh(geometry, material);

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
