import { DynamicObject, Player, RoomConfig, Tiles } from "./generators/types"

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
  const { rows = 100, colls = 100, objects = [], rooms = [] } = initialState

  const staticGrid = Array.from<number>({ length: rows * colls }).fill(Tiles.Wall)

  const setState = (newState: Partial<State>) => {
    Object.assign(state, newState)
  }

  const state = {
    ...initialState,
    rows,
    colls,
    staticGrid,
    objects,
    rooms,
    setState
  }

  return state
}