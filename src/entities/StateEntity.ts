import { state } from "@/state";
import { Quaternion } from "cannon";
import { QuaternionLike, Vector3, Vector3Like } from "three";
import { SettingObject } from "../objects/hero/settings";

export interface StateEntityProps extends SettingObject {
  id: string;
  position?: Vector3Like;
  rotation?: QuaternionLike;
};

interface StateEntityOptions {
  // Отправлять урон на сервер, чтобы его видели остальные клиенты
  networked?: boolean;
  // Удалять объект сразу при health <= 0. Персонажи отключают это и удаляют себя сами после анимации смерти
  killOnZeroHealth?: boolean;
}

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

  private readonly options: Required<StateEntityOptions>;
  private readonly unsubscribe: () => void;

  constructor(props: Partial<StateEntityProps>, options: StateEntityOptions = {}) {
    this.props = {
      ...defaultState,
      ...props,
    };

    this.options = { networked: false, killOnZeroHealth: true, ...options };

    this.unsubscribe = state.listen((_, next) => {
      if (next.objects?.[this.props.id]) {
        Object.assign(this.props, next.objects[this.props.id]);
      }
    }) as unknown as () => void;
  }

  private updateState(props: Partial<StateEntityProps>) {
    state.setState({
      objects: {
        [this.props.id]: props
      }
    }, { server: !this.options.networked });

    Object.assign(this.props, state.objects[this.props.id]);
  }

  makeHit(damage: number) {
    const health = this.props.health - damage;

    this.updateState({
      health
    });

    if (health <= 0 && this.options.killOnZeroHealth) {
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

  dispose() {
    this.unsubscribe();
  }
}
