import * as CANNON from 'cannon'
import { Vector3Like } from 'three';

export const physicWorld = new CANNON.World();
window.physicWorld = physicWorld;

physicWorld.gravity.set(0, -9.82, 0); // m/s²

console.log('physicWorld', physicWorld)

export const createPhysicBox = (dimensions: Vector3Like, options: CANNON.IBodyOptions) => {
  const { x, y, z } = dimensions;
  const shape = new CANNON.Box(new CANNON.Vec3(x, y, z));

  return new CANNON.Body({ ...options, shape });
}

export const createGroundBody = () => {
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

  return groundBody
}