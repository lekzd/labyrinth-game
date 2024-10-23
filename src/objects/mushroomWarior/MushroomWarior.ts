import * as CANNON from "cannon";
import { createPhysicBox } from "@/cannon";
import { loads } from "@/loader";
import { DynamicObject } from "@/types";
import { AnimationMixer, Group, Object3DEventMap } from "three";

const PHYSIC_Y = 0;

function initPhysicBody({ mass = 5, size = 5 }) {
  return createPhysicBox(
    { x: size, y: PHYSIC_Y, z: size },
    { mass, fixedRotation: true, type: CANNON.Body.DYNAMIC }
  );
}

export class MushroomWarior {
  mesh: Group<Object3DEventMap>;
  props: DynamicObject;
  physicBody: CANNON.Body;
  mixer: AnimationMixer;
  animations: any;
  jumpCounter: number = 0;

  constructor(props: DynamicObject) {
    this.props = props;
    const model = loads.model_glb.Mushroom_Warrior!.clone();

    model.updateMatrix(); 

    this.mesh = model as Group<Object3DEventMap>;

    this.mesh.position.copy(props.position);

    this.mesh.updateMatrix();

    this.physicBody = initPhysicBody({ mass: 10 });

    this.physicBody.position.set(
      props.position.x,
      props.position.y,
      props.position.z
    );

    this.mixer = new AnimationMixer(this.mesh);

    // this.mixer.clipAction("Attack").play();

    // this.mixer.timeScale = 1.5;
    // this.animations = initAnimations(this.mesh, this.mixer);

    // console.log(this.animations);
  }

  update(timeDelta: number) {
    this.jumpCounter += 1;
    if (this.jumpCounter % 100 === 0) {
      this.physicBody.applyLocalImpulse(new CANNON.Vec3(0, 200, 0), this.physicBody.position);
    }
    this.mixer.update(timeDelta);
  }
}
