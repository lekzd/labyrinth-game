import { modelType, weaponType } from "../loader";

export type ObjectType =
  | modelType
  | weaponType
  | "Campfire"
  | "Box"
  | "PuzzleHandler"
  | "Gate"
  | "Tree"
  | "Stone"
  | "Pine"
  | "Foliage"
  | "MagicTree"
  | "MagicMushroom"
  | "MushroomWarior"
  | "AltarPart";
