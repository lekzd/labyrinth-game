import {models, modelType} from "../loader.ts";

export enum Tiles {
  Floor,
  Wall,
  Tree,

  Empty,

  NorthExit,
  WestExit,
  SouthExit,
  EastExit,
}

export type DynamicObject = {
  id: number,
  type: modelType

  x: number,
  y: number,
  z: number,
}

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