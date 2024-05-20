import {modelType} from "../../loader.ts";

export type SettingObject = {
  health: number,
  mana: number,
  speed: number,
  mass: number,
  weapon: number | null,
}

export const settings: Record<modelType, SettingObject> = {
  [modelType.Monk]: {
    health: 30,
    mana: 10,
    speed: 3,
    mass: 50,
  },
  [modelType.Cleric]: {
    health: 30,
    mana: 10,
    speed: 3,
    mass: 25,
  },
  [modelType.Wizard]: {
    health: 30,
    mana: 10,
    speed: 3,
    mass: 25,
  },
  [modelType.Rogue]: {
    health: 30,
    mana: 10,
    speed: 3,
    mass: 25,
  },
  [modelType.Warrior]: {
    health: 30,
    mana: 10,
    speed: 3,
    mass: 25,
  },
}