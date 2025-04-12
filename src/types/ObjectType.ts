import { npcModelType, weaponType } from "../loader";

export type ObjectType =
  | npcModelType
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
  | "AltarPart"
  | "Stump"
  | "Hallow";
