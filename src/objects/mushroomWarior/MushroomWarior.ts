import { loads } from "@/loader";
import { DynamicObject, HeroProps } from "@/types";
import {
  AnimationMixer,
  Group,
  Object3DEventMap,
  Vector3Like
} from "three";
import { Room } from "../room/Room";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { random } from "@/utils/random";
import { initAnimations } from "@/utils/initAnimations";
import { StateEntity } from "@/entities/StateEntity";
import { HealthBar } from "../hero/healthbar";
import { HeroPhysicEntity } from "@/entities/HeroPhysicEntity";

const MASS = 10000;

enum BehaviorState {
  IDLE = "idle",
  ATTACK = "attack",
  RETURN = "return",
  PATROL = "patrol"
}

export class MushroomWarior {
  mesh: Group<Object3DEventMap>;
  props: DynamicObject;
  mixer: AnimationMixer;
  animations: any;
  tickCounter: number = random(0, 100);
  room: Room | null = null;
  state: StateEntity;

  behaviorState: BehaviorState = BehaviorState.PATROL;
  behaviorTarget: Vector3Like | null = null;

  private attackCoolDown = false;
  healthBar: ReturnType<typeof HealthBar>;
  physicEntity: any;

  constructor(props: DynamicObject) {
    this.props = props;
    const model = clone(loads.model.Mashroom!);

    model.updateMatrix();

    this.state = new StateEntity({
      id: props.id,
      health: 100,
      mana: 100,
      speed: 1,
      mass: MASS,
      attack: 10,
    });
    
    this.mesh = model as Group<Object3DEventMap>;
    
    this.mesh.scale.set(0.07, 0.07, 0.07);
    this.mesh.position.copy(props.position);

    this.physicEntity = new HeroPhysicEntity({
      target: this.mesh,
      physicY: 6,
      physicRadius: 5,
      mass: this.state.props.mass,
    });

    this.healthBar = HealthBar(this.state.props, this.mesh);

    [
      loads.animation.idle,
      loads.animation.run,
      loads.animation.walk,
      loads.animation.jumping,
    ].forEach(group => {
      if (group) {
        group.animations.forEach(animation => {
          this.mesh.animations.push(animation);
        })
      }
    });

    this.mixer = new AnimationMixer(this.mesh);

    this.animations = initAnimations(this.mesh, this.mixer);

    this.mixer.clipAction(this.mesh.animations[1]).play();
  }

  setRoom(room: Room) {
    this.room = room;
  }

  onStateChange(prev: DynamicObject, next: DynamicObject) {
    if (next.health) {
      this.healthBar.update(this.state.props);
    }

    if (next.position) {
      this.physicEntity.setPosition(next.position);
    }

    if (next.rotation) {
      this.physicEntity.setRotation(next.rotation);
    }
  }

  update(timeDelta: number) {
    this.mixer.update(timeDelta);
  }

  hit(by: HeroProps) {
    this.state.makeHit(by.attack ?? 10);
  }
}
