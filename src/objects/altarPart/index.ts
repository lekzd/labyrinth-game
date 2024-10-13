import { BoxGeometry, Mesh, MeshPhongMaterial, Object3DEventMap } from "three";
import { DynamicObject } from "@/types";
import * as CANNON from "cannon";
import { createPhysicBox } from "@/cannon";
import { createInteractivitySign } from "@/utils/interactivitySign";
import { state } from "@/state";
import { currentPlayer } from "@/main";

const PHYSIC_Y = 0;
export class AltarPart {
  readonly props: DynamicObject;
  readonly mesh: Mesh<BoxGeometry, MeshPhongMaterial, Object3DEventMap>;
  readonly physicBody: CANNON.Body;
  readonly physicY = PHYSIC_Y;
  sign: ReturnType<typeof createInteractivitySign>;

  constructor(props: DynamicObject) {
    const halfExtents = new CANNON.Vec3(2, 2, 2);
    this.props = props;
    this.mesh = initMesh(halfExtents);
    this.physicBody = initPhysicBody(halfExtents);
    this.sign = createInteractivitySign();

    this.sign.mesh.position.y = 12;

    this.mesh.add(this.sign.mesh);

    this.physicBody.position.set(
      props.position.x,
      props.position.y,
      props.position.z
    );
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

function initPhysicBody(halfExtents: CANNON.Vec3) {
  return createPhysicBox(
    halfExtents,
    { mass: 100, type: CANNON.Body.DYNAMIC }
  );
}
