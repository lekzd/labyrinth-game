import { Tiles } from "@/config";

export type Player = {
  id: string;
  activeObjectId: string;
};

export type RoomConfig = {
  id: number;
  width: number;
  height: number;
  actions: Tiles[];
  tiles: Tiles[];
  x: number;
  y: number;
};
