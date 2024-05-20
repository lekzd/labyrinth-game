import { DynamicObject } from "./DynamicObject";
import { modelType } from "@/loader";
import { MapObject } from "./MapObject";
import { Tiles } from "./Tiles";
import { ObjectType } from "./ObjectType";
import { RoomConfig } from "./";

type Player = {
  id: string;
  activeObjectId: string;
};

type RoomConfig = {
  id: number;
  width: number;
  height: number;
  actions: Tiles[];
  tiles: Tiles[];
  x: number;
  y: number;
};
interface HeroisProps extends DynamicObject {
  type: modelType;
}

export {
  DynamicObject,
  HeroisProps,
  modelType,
  MapObject,
  Tiles,
  ObjectType,
  Player,
  RoomConfig,
};
