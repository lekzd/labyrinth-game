import { ObjectType } from "./ObjectType";
import { SettingObject } from "../objects/hero/settings.ts";
import { Vector3 } from "three";
import { StateEntity } from "@/entities/StateEntity.ts";

export type ObjectQuaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type DynamicObject = {
  id: string;
  type: ObjectType;
  state: StateEntity;
  baseAnimation?: string;
  additionsAnimation?: string;
  onHit?: (props: DynamicObject) => void;

  position: Vector3;
  rotation: ObjectQuaternion;
} & Partial<SettingObject>;
