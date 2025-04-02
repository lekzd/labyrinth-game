import { BoxGeometry, CylinderGeometry, Mesh, MeshPhongMaterial, MeshPhysicalMaterial, Object3DEventMap } from "three";
import { DynamicObject } from "@/types";
import { state } from "@/state";
import { Tween } from "@tweenjs/tween.js";
import { loads } from "@/loader";
import { textureRepeat } from "@/utils/textureRepeat";
import { shadowSetter } from "@/utils/shadowSetter";
import { GatePhysicEntity } from "../entities/GatePhysicEntity";

export class Gate {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;

  private leftDoor: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  private rightDoor: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;

  physicEntity: GatePhysicEntity;

  constructor(props: DynamicObject) {
    this.props = props;
    this.mesh = new Mesh()

    const left = initTower(6, 30, 10);
    left.position.x = -10
    this.mesh.add(left)

    shadowSetter(left, {
      castShadow: true,
      receiveShadow: true,
    })

    this.leftDoor = new Mesh()
    const leftDoorMesh = initMesh(6, 20, 1);
    leftDoorMesh.position.x = -2
    this.leftDoor.position.x = 5

    shadowSetter(leftDoorMesh, {
      castShadow: true,
      receiveShadow: true,
    })

    this.leftDoor.add(leftDoorMesh)
    this.mesh.add(this.leftDoor)

    this.rightDoor = new Mesh()
    const rightDoorMesh = initMesh(6, 20, 1);
    rightDoorMesh.position.x = 2
    this.rightDoor.position.x = -5

    shadowSetter(rightDoorMesh, {
      castShadow: true,
      receiveShadow: true,
    })

    this.rightDoor.add(rightDoorMesh)
    this.mesh.add(this.rightDoor)

    const right = initTower(6, 30, 10);
    right.position.x = 10
    this.mesh.add(right)

    shadowSetter(right, {
      castShadow: true,
      receiveShadow: true,
    })

    Object.assign(this.mesh.position, props.position);
    Object.assign(this.mesh.quaternion, props.rotation);

    this.physicEntity = new GatePhysicEntity({
      target: this.mesh,
      physicY: 0,
      physicRadius: 5,
      mass: 100,
    });

    state.listen((_, next) => {
      if (next.objects?.[this.props.id]) {
        this.updateState();
      }
    })
  }

  update(time: number) {}

  get closed() {
    return !!state.objects[this.props.id].state
  }

  set closed(value: boolean) {
    state.setState({
      objects: { [this.props.id]: { state: value ? 1 : 0 } }
    })
  }

  private updateState() {
    new Tween(this.leftDoor.rotation)
      .to({ y: this.closed ? (Math.PI / 2) : 0 }, 300)
      .onComplete(() => {
        this.physicEntity.doorShape.collisionResponse = !this.closed
      })
      .start();

    new Tween(this.rightDoor.rotation)
      .to({ y: this.closed ? (-Math.PI / 2) : 0 }, 300)
      .start();
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
    new MeshPhysicalMaterial({
      color: 0x999999,
      fog: true,
      map: textureRepeat(loads.texture["wood_gate_map.jpg"]!, 10, 10, x, y),
      normalMap: textureRepeat(loads.texture["wood_gate_bump.jpg"]!, 10, 10, x, y),
      roughness: 0.5,
      metalnessMap: textureRepeat(loads.texture["wood_gate_metalness_map.jpg"]!, 10, 10, x, y),
      metalness: 1,
      specularColor: 0x000000,
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
