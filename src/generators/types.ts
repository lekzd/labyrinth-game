
export enum Tiles {
  Floor = 0,
  Wall = 1,

  NorthExit,
  WestExit,
  SouthExit,
  EastExit,
}

export type DynamicObject = {
  id: number,
  x: number,
  y: number,
  z: number,
}

export type Player = {
  id: number,
  activeObjectId: number
}

export type RoomConfig = {
  width: number
  height: number
  actions: Tiles[]
  tiles: Tiles[]
  x: number
  y: number
}