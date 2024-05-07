import { Player, RoomConfig } from "./generators/types"
import { modelType } from "./loader"
import { DynamicObject } from "./types/DynamicObject"
import { Tiles } from "./types/Tiles"
import { something } from "./utils/something"

// TODO: засунуть сюда какой-нибудь стейт-менеджер
export type State = {
  rows: number
  colls: number
  staticGrid: Tiles[]
  rooms: RoomConfig[]
  objects: DynamicObject[]
  players: Player[]
  activePlayerId: number
  setState: (state: Partial<State>) => void
}

export const initState = (initialState: Partial<State>): State => {
  const {
    rows = 100,
    colls = 100,
    objects = [],
    rooms = [],
    players = [],
    activePlayerId = -1,
  } = initialState

  const staticGrid = Array.from<number>({ length: rows * colls }).fill(Tiles.Floor)

  const setState = (newState: Partial<State>) => {
    Object.assign(state, newState)
  }

  const state = {
    ...initialState,
    rows,
    colls,
    staticGrid,
    objects,
    players,
    activePlayerId,
    rooms,
    setState
  }

  return state
}

const ROWS = 100
const COLLS = 100

const createPersonObject = (): DynamicObject => {
  return {
    id: Math.floor(Math.random() * 1e9),
    type: something(Object.values(modelType)),
    x: 0,
    y: 0,
    z: 0,
  }
}

const createPlayerObject = (activeObjectId: number): Player => {
  return {
    id: Math.floor(Math.random() * 1e9),
    activeObjectId,
  }
}

const firstPerson = createPersonObject()
const firstPlayer = createPlayerObject(firstPerson.id)

export const state = initState({
  rows: ROWS,
  colls: COLLS,
  objects: [
    firstPerson,
    createPersonObject(),
  ],
  players: [
    createPlayerObject(firstPerson.id)
  ],
  activePlayerId: firstPlayer.id
})