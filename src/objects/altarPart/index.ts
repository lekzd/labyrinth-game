import { BoxGeometry, Mesh, MeshPhongMaterial, Object3DEventMap } from "three";
import { DynamicObject } from "@/types";
import * as CANNON from "cannon";
import { createInteractivitySign } from "@/utils/interactivitySign";
import { state } from "@/state";
import { currentPlayer } from "@/main";
import { BoxPhysicEntity } from "@/entities/BoxPhysicEntity";

export class AltarPart {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly physicEntity: BoxPhysicEntity;
  sign: ReturnType<typeof createInteractivitySign>;

  constructor(props: DynamicObject) {
    const halfExtents = new CANNON.Vec3(2, 2, 2);
    this.props = props;

    this.sign = createInteractivitySign();
    this.sign.mesh.position.y = 12;
    
    this.mesh = initMesh(halfExtents);
    this.mesh.add(this.sign.mesh);
    Object.assign(this.mesh.position, props.position);

    this.physicEntity = new BoxPhysicEntity({
      target: this.mesh,
      physicY: 0,
      physicRadius: 2,
      mass: 10,
    });
  }
  update(time: number) {}

  setFocus(value: boolean) {
    this.sign.setFocused(value);
  }

  interactWith(value: boolean) {
    if (value) {
      state.setState({
        objects: {
          [currentPlayer.activeObjectId]: { weapon: this.props.type },
          [this.props.id]: null,
        }
      });
    }
  }
}

function initMesh(halfExtents: CANNON.Vec3) {
  const boxGeometry = new BoxGeometry(
    halfExtents.x * 2,
    halfExtents.y * 2,
    halfExtents.z * 2
  );
  return new Mesh(
    boxGeometry,
    new MeshPhongMaterial({ color: 0xffffff, fog: true })
  );
}
