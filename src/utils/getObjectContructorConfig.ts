import { ObjectType } from "@/types";
import { Campfire, Hero, PuzzleHandler, Weapon } from "@/uses";
import { modelType } from "../loader.ts";
import { Box } from "cannon";
import { Gate } from "../objects/gate/index.ts";

export const getObjectContructorConfig = (type: ObjectType) => {
  switch (type) {
    case "Campfire":
      return {
        Constructor: Campfire,
        physical: false,
        interactive: true,
      };
    case "Box":
      return {
        Constructor: Box,
        physical: true,
        interactive: true,
      };
    case "Gate":
      return {
        Constructor: Gate,
        physical: true,
        interactive: false,
      };
    case "PuzzleHandler":
      return {
        Constructor: PuzzleHandler,
        physical: true,
        interactive: true,
      };
    case modelType.Warrior:
    case modelType.Rogue:
    case modelType.Monk:
    case modelType.Cleric:
    case modelType.Wizard:
    case modelType.Skeleton_Mage:
      return {
        Constructor: Hero,
        physical: true,
        interactive: true,
      };
      break;
    default:
      return {
        Constructor: Weapon,
        physical: true,
        interactive: true,
      };
  }
};
