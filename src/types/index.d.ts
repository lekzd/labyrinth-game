import { DynamicObject } from "./DynamicObject";
import { modelType } from "@/loader";
import { MapObject } from "./MapObject";
interface HeroisProps extends DynamicObject {
  type: modelType;
}

export { DynamicObject, HeroisProps, modelType, MapObject };
