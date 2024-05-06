import { Player, RoomConfig } from "./generators/types"
import { DynamicObject } from "./types/DynamicObject"
import { Tiles } from "./types/Tiles"

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