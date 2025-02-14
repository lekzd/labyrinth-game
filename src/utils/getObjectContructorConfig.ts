import { ObjectType } from "@/types";
import { Box, Campfire, Hero, PuzzleHandler, Weapon } from "@/uses";
import {modelType, weaponType} from "../loader.ts";
import { Gate } from "../objects/gate/index.ts";
import { Tree } from "@/objects/tree";
import { MagicTree } from "@/objects/tree/MagicTree";
import { Stone } from "@/objects/stone/index.ts";
import { Pine } from "@/objects/pine/index.ts";
import { Foliage } from "@/objects/foliage/index.ts";
import { AltarPart } from "@/objects/altarPart/index.ts";
import { Stump } from "@/objects/stump";
import { MagicMushroom } from "@/objects/magicMushroom/MagicMushroom.ts";
import { MushroomWarior } from "@/objects/mushroomWarior/MushroomWarior.ts";

const constructors = {
  Campfire,
  Tree,
  Stone,
  Pine,
  PuzzleHandler,
  MagicTree,
  Gate,
  Foliage,
  Box,
  Stump,
  AltarPart,
  MagicMushroom,
  MushroomWarior
}

// По-умолчанию все объекты просто физические
const props = {
  PuzzleHandler: { physical: true, interactive: true },
  Gate: { physical: true, interactive: true },
  Foliage: {},
  Campfire: {},
  AltarPart: { physical: true, interactive: true },
}

// Прокидываем всех персонажей
for (const key of Object.values(modelType)) {
  constructors[key] = Hero;
  props[key] = { physical: true, interactive: true };
}

// Прокидываем все вещи
for (const key of Object.values(weaponType)) {
  constructors[key] = Weapon;
  props[key] = { physical: true, interactive: true };
}

export const getObjectContructorConfig = (type: ObjectType) => ({
  Constructor: constructors[type],
  ...(props[type] || { physical: true  })
});
