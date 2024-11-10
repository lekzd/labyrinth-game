import { Vector3Like } from "three";

export const get2DAngleBetweenPoints = (from: Vector3Like, to: Vector3Like) => {
  return Math.atan2(to.x - from.x, to.z - from.z);
};
