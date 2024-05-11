import * as THREE from 'three';
import { Room } from '../objects/room/index.ts';
import { MapObject } from '../types/MapObject.ts';

export const CullingSystem = () => {
  const frustum = new THREE.Frustum();

  return {
    update: (
      camera: THREE.Camera,
      rooms: ReturnType<typeof Room>[],
      objects:  Record<string, MapObject>,
      decorationObjects: THREE.Mesh[],
    ) => {
      const cameraViewProjectionMatrix = new THREE.Matrix4()

      camera.updateMatrixWorld(); // make sure the camera matrix is updated
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      frustum.setFromProjectionMatrix(cameraViewProjectionMatrix)

      rooms.forEach(room => {
        const distance = room.mesh.position.distanceTo(camera.position)

        if (distance > 400) {
          room.mesh.visible = false
        } else {
          room.mesh.visible = frustum.intersectsObject(room.floorMesh)
        }

        if (distance > 200) {
          room.offline()
        } else {
          room.online()
        }
      })

      for (const id in objects) {
        const { mesh } = objects[id];
        const g = mesh.geometry ? mesh : mesh.children[0]
        const distance = mesh.position.distanceTo(camera.position)

        if (!g.geometry) {
          continue
        }

        if (distance > 400) {
          mesh.visible = false
        } else {
          if (!frustum.intersectsObject(g)) {
            mesh.visible = distance < 50
          } else {
            mesh.visible = true
          }
        }
      }

      decorationObjects.forEach(mesh => {
        const distance = mesh.position.distanceTo(camera.position)

        if (distance > 200) {
          mesh.visible = false
        } else {
          mesh.visible = frustum.intersectsObject(mesh)
        }
      })

    },
  }
}