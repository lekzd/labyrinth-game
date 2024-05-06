import { modelType } from "../loader"

export type DynamicObject = {
  id: number,
  type: modelType

  x: number,
  y: number,
  z: number,
}