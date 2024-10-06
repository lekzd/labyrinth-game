import { scale } from "@/state";
import { RoomConfig } from "@/types";
import { Mesh, Object3D, PlaneGeometry } from "three";
import { createFloorMaterial } from "./floorMaterial";
import { systems } from "@/systems";

export const RoomFloorMesh = (props: RoomConfig) => {
  const mesh = new Object3D();
  mesh.visible = false;
  mesh.position.set(props.x * scale, 0, props.y * scale);

  const floorMesh = initFloorMesh(props);
  const grassMesh = systems.grassSystem.createRoomMesh(props);

  mesh.add(floorMesh);
  mesh.add(grassMesh);
  mesh.updateMatrixWorld();
  mesh.matrixAutoUpdate = false;

  return mesh;
};

function initFloorMesh(props: RoomConfig) {
  const floorMesh = new Mesh(
    new PlaneGeometry(props.width * scale, props.height * scale),
    createFloorMaterial(props)
  );

  floorMesh.position.set(
    Math.floor(props.width / 2) * scale,
    0,
    Math.floor(props.height / 2) * scale
  );

  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  return floorMesh;
}
