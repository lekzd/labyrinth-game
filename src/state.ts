import { Player, RoomConfig } from "./generators/types";
import { modelType } from "./loader";
import { DynamicObject, Tiles } from "@/types";
import { something } from "./utils/something";
import { NpcAnimationStates } from "./objects/hero/NpcAnimationStates.ts";
import { mergeDeep } from "./utils/mergeDeep.ts";
import { settings } from "./objects/hero/settings.ts";

type setState = (
  state: Partial<State>,
  params?: { permoment?: boolean; server?: boolean; throttle?: string }
) => void;

// TODO: засунуть сюда какой-нибудь стейт-менеджер
export type State = {
  rows: number;
  colls: number;
  staticGrid: Tiles[];
  rooms: RoomConfig[];
  objects: Record<string, DynamicObject>;
  players: Record<string, Player>;
  activePlayerId: number;
  setState: setState;
  listen(handler: setState): void;
};

export const initState = (initialState: Partial<State>): State => {
  const {
    rows = 100,
    colls = 100,
    objects = {},
    rooms = [],
    players = {},
  } = initialState;

  const staticGrid = Array.from<number>({ length: rows * colls }).fill(-1);

  const subscribers = new Set();

  const listen = (handle: setState) => {
    subscribers.add(handle);

    return () => {
      subscribers.delete(handle);
    };
  };

  const setState = (newState: Partial<State> = {}, params) => {
    mergeDeep(state, newState);

    subscribers.forEach((handle) => {
      handle(newState, params);
    });
  };

  const state = {
    ...initialState,
    rows,
    colls,
    staticGrid,
    objects,
    players,
    rooms,
    listen,
    setState,
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
    state: NpcAnimationStates.idle,
    type,
    weapon: null,
    ...settings[type],
  });
};

export const createPlayerObject = (activeObjectId: string): Player => {
  return {
    id: `${Math.floor(Math.random() * 1e9)}`,
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
  });
};

export const state = initState({
  rows: ROWS,
  colls: COLLS,
  objects: {},
  players: {},
});

window.state = state;
