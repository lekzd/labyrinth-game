import * as CANNON from "cannon";
import { createPhysicBox } from "@/cannon";
import { loads } from "@/loader";
import { DynamicObject } from "@/types";
import {
  AnimationMixer,
  Group,
  Object3DEventMap,
  Vector3Like
} from "three";
import { Room } from "../room/Room";
import { selectAllPlayerObjects } from "@/utils/stateUtils";
import { getDistance } from "@/utils/getDistance";
import { get2DAngleBetweenPoints } from "@/utils/getAngleBetweenPoints";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { random } from "@/utils/random";
import { getScalarVectorAngle } from "@/utils/getScalarVectorAngle";

const PHYSIC_Y = 12;
const MASS = 10000;

function initPhysicBody({ mass = 5, size = 3 }) {
  const material = new CANNON.Material("mushroomWarrior");
  material.friction = 0; // Устанавливаем трение на 0

  return createPhysicBox(
    { x: size, y: PHYSIC_Y, z: size },
    { mass, fixedRotation: true, type: CANNON.Body.DYNAMIC, material }
  );
}

enum BehaviorState {
  IDLE = "idle",
  ATTACK = "attack",
  RETURN = "return",
  PATROL = "patrol"
}

export class MushroomWarior {
  mesh: Group<Object3DEventMap>;
  props: DynamicObject;
  physicBody: CANNON.Body;
  mixer: AnimationMixer;
  animations: any;
  tickCounter: number = random(0, 100);
  room: Room | null = null;
  readonly physicY = PHYSIC_Y;

  behaviorState: BehaviorState = BehaviorState.PATROL;
  behaviorTarget: Vector3Like | null = null;

  constructor(props: DynamicObject) {
    this.props = props;
    const model = clone(loads.model_glb.Mushroom_Warrior!);

    model.updateMatrix();

    this.mesh = model as Group<Object3DEventMap>;

    this.mesh.position.copy(props.position);

    this.mesh.updateMatrix();

    this.physicBody = initPhysicBody({ mass: MASS });

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

  setRoom(room: Room) {
    this.room = room;
  }

  update(timeDelta: number) {
    this.tickCounter += 1;

    if (this.tickCounter % 100 === 0 && this.room) {
      const [object] = selectAllPlayerObjects({
        objects: this.room.objectsInside
      }).sort(
        (a, b) =>
          getDistance(a.position, this.room!.center) -
          getDistance(b.position, this.room!.center)
      );

      const distanceToPlayer = object
        ? getDistance(this.mesh.position, object.position)
        : 10000;
      const distanceToCenter = getDistance(
        this.mesh.position,
        this.room.center
      );

      const impluse = 40 * MASS;

      const goToTarget = (target: Vector3Like) => {
        if (!this.physicBody) {
          return;
        }

        const objectPosition = this.mesh.position;

        if (objectPosition.y > 0) {
          return;
        }

        const direction = new CANNON.Vec3(
          target.x - objectPosition.x,
          // target.y - objectPosition.y,
          0,
          target.z - objectPosition.z
        );

        // Нормализуем вектор, чтобы его длина была равна 1
        direction.normalize();

        // Умножаем нормализованный вектор на силу импульса
        const impulseVector = new CANNON.Vec3(
          direction.x * impluse * 2,
          impluse,
          direction.z * impluse * 2
        );

        const angleToTarget = get2DAngleBetweenPoints(
          this.mesh.position,
          target
        );

        this.physicBody.quaternion.setFromAxisAngle(
          new CANNON.Vec3(0, 1, 0),
          angleToTarget
        );

        this.physicBody.applyImpulse(
          impulseVector,
          this.physicBody.position
        );
      };

      if (distanceToCenter < 100) {
        // грибок в грибнице, может атаковать

        if (distanceToPlayer < 50) {
          this.behaviorState = BehaviorState.ATTACK;
          this.behaviorTarget = object.position;
        } else {
          this.behaviorState = BehaviorState.PATROL;

          const angle = getScalarVectorAngle(
            this.mesh.position.x,
            this.mesh.position.z,
            this.room!.center.x,
            this.room!.center.z
          );

          const angleToTarget = (angle + Math.PI / 6) % (Math.PI * 2);

          this.behaviorTarget = new CANNON.Vec3(
            this.room!.center.x + Math.cos(angleToTarget) * 30,
            0,
            this.room!.center.z + Math.sin(angleToTarget) * 30
          );
        }
      } else {
        // грибок отошел от грибницы, идет обратно

        if (distanceToCenter > 10) {
          this.behaviorState = BehaviorState.RETURN;
          this.behaviorTarget = this.room!.center;
        }
      }


      if (this.behaviorState !== BehaviorState.IDLE && this.behaviorTarget) {
        goToTarget(this.behaviorTarget)
      }
    }

    this.mixer.update(timeDelta);
  }
}
