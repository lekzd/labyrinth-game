import { DynamicObject } from "./DynamicObject";
import { modelType } from "@/loader";
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
  direction: Tiles;
  x: number;
  y: number;
};
interface HeroProps extends DynamicObject {
  type: modelType;
}

export type {
  DynamicObject,
  HeroProps,
  modelType,
  MapObject,
  Tiles,
  ObjectType,
  Player,
  RoomConfig,
};
