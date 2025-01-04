import {modelType, modelTypeGlb, weaponType} from "../../loader.ts";

export type SettingObject = {
  health: number,
  mana: number,
  speed: number,
  size?: number,
  mass: number,
  weapon?: weaponType,
  attack: number,
}

export const settings: Record<modelType & modelTypeGlb, SettingObject> = {
  // [modelType.Monk]: {
  //   health: 100,
  //   mana: 10,
  //   speed: 2,
  //   mass: 50,
  //   attack: 5,
  // },
  // [modelType.Cleric]: {
  //   health: 50,
  //   mana: 10,
  //   speed: 3,
  //   mass: 25,
  //   attack: 5,
  // },
  // [modelType.Wizard]: {
  //   health: 50,
  //   mana: 10,
  //   speed: 3,
  //   mass: 25,
  //   attack: 5,
  // },
  // [modelType.Rogue]: {
  //   health: 30,
  //   mana: 10,
  //   speed: 3,
  //   size: 2,
  //   mass: 25,
  //   attack: 5,
  // },
  // [modelType.Warrior]: {
  //   health: 60,
  //   mana: 10,
  //   speed: 2.5,
  //   mass: 25,
  //   attack: 5,
  // },
  [modelType.Journey]: {
    health: 50,
    mana: 10,
    speed: 2.5,
    mass: 25,
    attack: 5,
  },
  [modelType.Mashroom]: {
    health: 10,
    mana: 10,
    speed: 2.5,
    mass: 25,
    attack: 5,
  },
  [modelType.Hallow]: {
    health: 10,
    mana: 10,
    speed: 2.5,
    mass: 25,
    attack: 5,
  },
  [modelTypeGlb.Mushroom_Warrior]: {
    health: 10,
    mana: 10,
    speed: 2.5,
    mass: 25,
    attack: 5,
  },
}