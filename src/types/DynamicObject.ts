import { ObjectType } from "./ObjectType"

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
  id: number,
  type: ObjectType,

  position: ObjectVector3,
  rotation: ObjectQuaternion,
}