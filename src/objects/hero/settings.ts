import {modelType, weaponType} from "../../loader.ts";

export type SettingObject = {
  health: number,
  mana: number,
  speed: number,
  mass: number,
  weapon?: weaponType,
}

export const settings: Record<modelType, SettingObject> = {
  [modelType.Monk]: {
    health: 100,
    mana: 10,
    speed: 2,
    mass: 50,
  },
  [modelType.Cleric]: {
    health: 50,
    mana: 10,
    speed: 3,
    mass: 25,
  },
  [modelType.Wizard]: {
    health: 50,
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
    health: 60,
    mana: 10,
    speed: 2.5,
    mass: 25,
  },
}