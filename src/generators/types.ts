import { Tiles } from "../types/Tiles.ts";

export type Player = {
  id: number,
  activeObjectId: number
}

export type RoomConfig = {
  id: number,
  width: number
  height: number
  actions: Tiles[]
  tiles: Tiles[]
  x: number
  y: number
}