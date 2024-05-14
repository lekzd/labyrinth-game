import * as THREE from 'three';
import * as CANNON from 'cannon';
import { DynamicObject } from "../../types/DynamicObject";
import { physicWorld } from '../../cannon';
import {assign} from "../../utils/assign.ts";

export const Box = (props: DynamicObject) => {
  const physicY = 0
  const halfExtents = new CANNON.Vec3(5, 5, 5);
  const boxShape = new CANNON.Box(halfExtents);
  const boxGeometry = new THREE.BoxGeometry(
    halfExtents.x * 2,
    halfExtents.y * 2,
    halfExtents.z * 2,
  );

  const mesh = new THREE.Mesh(
    boxGeometry,
    new THREE.MeshPhongMaterial({ color: 0xffffff, fog: true }),
  )
  const boxBody = new CANNON.Body({ mass: 10 });
  boxBody.addShape(boxShape);

  assign(mesh.position, props.position)
  assign(mesh.quaternion, props.rotation)

  mesh.receiveShadow = true
  mesh.castShadow = true

  boxBody.position.set(
    props.position.x,
    props.position.y + 10,
    props.position.z,
  )

  boxBody.inertia = new CANNON.Vec3(50, 50, 50);

  // boxBody.quaternion.copy(props.rotation)

  physicWorld.addBody(boxBody);

  return {
    props,
    mesh,
    update: (time: number) => {},
    physicBody: boxBody,
    physicY,
  }
}