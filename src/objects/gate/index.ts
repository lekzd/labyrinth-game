import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshPhongMaterial, Object3DEventMap, Vector3Like } from "three";
import { DynamicObject } from "@/types";
import * as CANNON from "cannon";
import { state } from "@/state";
import { systems } from "@/systems";
import { Tween } from "@tweenjs/tween.js";
import { loads } from "@/loader";
import { textureRepeat } from "@/utils/textureRepeat";

const PHYSIC_Y = 0;
export class Gate {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = PHYSIC_Y;

  private busyOnInteraction = false;
  private leftDoor: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  private rightDoor: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;

  closed = true;
  doorShape: CANNON.Box;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = new Mesh()

    const left = initTower(6, 30, 10);
    left.position.x = -10
    this.mesh.add(left)

    this.leftDoor = new Mesh()
    const leftDoorMesh = initMesh(6, 20, 1);
    leftDoorMesh.position.x = -2
    this.leftDoor.position.x = 5

    this.leftDoor.add(leftDoorMesh)
    this.mesh.add(this.leftDoor)

    this.rightDoor = new Mesh()
    const rightDoorMesh = initMesh(6, 20, 1);
    rightDoorMesh.position.x = 2
    this.rightDoor.position.x = -5

    this.rightDoor.add(rightDoorMesh)
    this.mesh.add(this.rightDoor)

    const right = initTower(6, 30, 10);
    right.position.x = 10
    this.mesh.add(right)

    Object.assign(this.mesh.position, props.position);
    Object.assign(this.mesh.quaternion, props.rotation);

    this.physicBody = this.initPhysicBody();
  }
  update(time: number) {
    const obj = state.objects[this.props.id];
    this.setPosition(obj.position);
  }

  setPosition(position: Partial<Vector3Like>) {
    this.physicBody.position.set(
      position.x || this.physicBody.position.x,
      position.y ? position.y + this.physicY : this.physicBody.position.y,
      position.z || this.physicBody.position.z
    );
  }

  initPhysicBody() {
    const boxBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
    boxBody.addShape(
      new CANNON.Box(new CANNON.Vec3(5, 5, 5)),
      new CANNON.Vec3(-10, 0, 0)
    );
    this.doorShape = new CANNON.Box(new CANNON.Vec3(5, 5, 2.5));
    boxBody.addShape(
      this.doorShape,
      new CANNON.Vec3(0, 0, 0)
    );
    boxBody.addShape(
      new CANNON.Box(new CANNON.Vec3(5, 5, 5)),
      new CANNON.Vec3(10, 0, 0)
    );
    return boxBody;
  }

  interactWith() {
    const { input } = systems.inputSystem;

    if (!this.busyOnInteraction && input.interact) {
      new Tween(this.leftDoor.rotation)
        .to({ y: this.closed ? (Math.PI / 2) : 0 }, 300)
        .onComplete(() => {
          this.closed = !this.closed
          this.doorShape.collisionResponse = this.closed
        })
        .start();

      new Tween(this.rightDoor.rotation)
        .to({ y: this.closed ? (-Math.PI / 2) : 0 }, 300)
        .start();

      setTimeout(() => {
        this.busyOnInteraction = false;
      }, 1000);
      this.busyOnInteraction = true;
    }
  }
}

function initMesh(x: number, y: number, z: number) {
  const boxGeometry = new BoxGeometry(
    x,
    y,
    z,
  );

  return new Mesh(
    boxGeometry,
    new MeshPhongMaterial({
      color: 0x999999,
      fog: true,
      map: textureRepeat(loads.texture["wood_gate_map.jpg"]!, 10, 10, x, y),
      normalMap: textureRepeat(loads.texture["wood_gate_bump.jpg"]!, 10, 10, x, y),
    })
  );
}

function initTower(x: number, y: number, z: number) {
  const boxGeometry = new CylinderGeometry(x - 2, x, y, 6);
  return new Mesh(
    boxGeometry,
    new MeshPhongMaterial({
      color: 0x999999,
      fog: true,
      map: loads.texture["stone_wall_map.jpg"],
      normalMap: loads.texture["stone_wall_bump.jpg"],
    })
  );
}
