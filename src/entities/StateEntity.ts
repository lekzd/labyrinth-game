import { state } from "@/state";
import { Quaternion } from "cannon";
import { QuaternionLike, Vector3, Vector3Like } from "three";
import { SettingObject } from "../objects/hero/settings";

export interface StateEntityProps extends SettingObject {
  id: string;
  position?: Vector3Like;
  rotation?: QuaternionLike;
};

const defaultState: Omit<StateEntityProps, "id"> = {
  health: 100,
  mana: 100,
  speed: 1,
  mass: 1,
  attack: 10,
  position: new Vector3(0, 0, 0),
  rotation: new Quaternion(0, 0, 0, 1),
};

export class StateEntity {
  props: StateEntityProps = {
    ...defaultState,
    id: ""
  };

  constructor(props: Partial<StateEntityProps>) {
    this.props = {
      ...defaultState,
      ...props,
    };

    state.listen((prev, next) => {
      if (next.objects?.[this.props.id]) {
        Object.assign(this.props, next.objects[this.props.id]);
      }
    });
  }

  private updateState(props: Partial<StateEntityProps>) {
    state.setState({
      objects: {
        [this.props.id]: props
      }
    }, { server: true });

    Object.assign(this.props, state.objects[this.props.id]);
  }

  makeHit(damage: number) {
    const health = this.props.health - damage;

    this.updateState({
      health
    });

    if (health <= 0) {
      this.makeKill();
    }
  }

  makeMove(position: Vector3, rotation: Quaternion) {
    this.updateState({
      position,
      rotation
    });
  }

  makeKill() {
    state.setState(
      {
        objects: {
          [this.props.id]: null
        }
      },
      { server: true }
    );
  }
}
