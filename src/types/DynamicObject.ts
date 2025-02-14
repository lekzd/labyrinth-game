import { ObjectType } from "./ObjectType";
import { SettingObject } from "../objects/hero/settings.ts";

export type ObjectVector3 = {
  x: number;
  y: number;
  z: number;
};

export type ObjectQuaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type DynamicObject = {
  id: string;
  type: ObjectType;
  state?: any;
  baseAnimation?: string;
  additionsAnimation?: string;
  onHit?: (props: DynamicObject) => void;

  position: ObjectVector3;
  rotation: ObjectQuaternion;
} & Partial<SettingObject>;
