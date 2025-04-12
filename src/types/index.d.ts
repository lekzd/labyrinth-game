import { DynamicObject } from "./DynamicObject";
import { npcModelType } from "@/loader";
import { MapObject } from "./MapObject";
import { Tiles } from "@/config";
import { ObjectType } from "./ObjectType";

type Player = {
  id: string;
  activeObjectId: string;
};

type RoomConfig = {
  id: string;
  width: number;
  height: number;
  actions: Tiles[];
  tiles: Tiles[];
  x: number;
  y: number;
};
interface HeroProps extends DynamicObject {
  type: npcModelType;
}

export type {
  DynamicObject,
  HeroProps,
  npcModelType as modelType,
  MapObject,
  Tiles,
  ObjectType,
  Player,
  RoomConfig,
};
