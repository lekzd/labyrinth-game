import { ObjectType } from "./ObjectType"
import {NpcAnimationStates} from "../player/NpcAnimationStates.ts";

type ObjectVector3 = {
  x: number
  y: number
  z: number
}

type ObjectQuaternion = {
  x: number
  y: number
  z: number
  w: number
}

export type DynamicObject = {
  id: string,
  type: ObjectType,
  state: NpcAnimationStates,

  position: ObjectVector3,
  rotation: ObjectQuaternion,

  angle: number,
}