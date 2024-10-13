import { modelType, weaponType } from "./loader";
import { DynamicObject, Player, RoomConfig } from "@/types";
import { something } from "./utils/something";
import { NpcAnimationStates } from "./objects/hero/NpcAnimationStates.ts";
import { mergeDeep } from "./utils/mergeDeep.ts";
import { settings } from "./objects/hero/settings.ts";
import {pickPrev} from "@/utils/pickPrev.ts";

type RecursivePartial<T> = {
  [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
    T[P] extends object | undefined ? RecursivePartial<T[P]> :
    T[P];
};

type setState = (
  state: RecursivePartial<State>,
  params?: { server?: boolean }
) => void;

// TODO: засунуть сюда какой-нибудь стейт-менеджер
export type State = {
  rows: number;
  colls: number;
  rooms: Record<string, RoomConfig>;
  objects: Record<string, DynamicObject>;
  players: Record<string, Player>;
  activePlayerId: number;
  setState: setState;
  listen(handler: (prev: RecursivePartial<State>, next: RecursivePartial<State>, params?: { server?: boolean }) => void): void;
  select: <T>(selector: (state: Partial<State>) => T) => T;
};

export const initState = (initialState: Partial<State>): State => {
  const {
    rows = 100,
    colls = 100,
    objects = {},
    rooms = {},
    players = {},
  } = initialState;

  const subscribers = new Set();

  const listen = (handle: setState) => {
    subscribers.add(handle);

    return () => {
      subscribers.delete(handle);
    };
  };

  const setState = (newState: RecursivePartial<State> = {}, params: { server?: boolean } = {}) => {
    const prev = pickPrev(state, newState);

    mergeDeep(state, newState);

    subscribers.forEach((handle) => {
      handle(prev, newState, params);
    });
  };

  const state = {
    ...initialState,
    rows,
    colls,
    objects,
    players,
    rooms,
    listen,
    setState,
    select: <T>(selector: (state: Partial<State>) => T) => selector(state)
  };

  return state;
};

export const ROWS = 150;
export const COLLS = 150;

let id = 0;

const getId = () => `${id++}`;

export const createObject = (data: Partial<DynamicObject>): DynamicObject => {
  return {
    id: getId(),
    type: "Box",

    position: {
      x: 0,
      y: 0,
      z: 0,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
      w: 0,
    },

    ...data,
  };
};

export const createHeroObject = (
  data: Partial<DynamicObject>
): DynamicObject => {
  const type = something(Object.values(modelType));

  return createObject({
    ...data,
    baseAnimation: NpcAnimationStates.idle,
    additionsAnimation: undefined,
    type,
    weapon: weaponType.dagger,
    ...settings[type],
  });
};

export const createPlayerObject = (activeObjectId: string): Player => {
  return {
    id: getId(),
    activeObjectId: `${activeObjectId}`,
  };
};

export const scale = 10;

export const createCampfireObject = (): DynamicObject => {
  return createObject({
    type: "Campfire",
    position: {
      x: (COLLS * scale) >> 1,
      y: 0,
      z: (ROWS * scale) >> 1,
    },
    state: false,
  });
};

export const state = initState({
  rows: ROWS,
  colls: COLLS,
  objects: {},
  players: {},
});

window.state = state;
