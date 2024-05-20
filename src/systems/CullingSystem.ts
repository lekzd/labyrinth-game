import * as THREE from 'three';

import { MapObject } from '@/types';
import { scale } from '@/state.ts';
import { systems } from './index.ts';
import { Room } from '@/uses';

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
      const { settings } = systems.uiSettingsSystem

      camera.updateMatrixWorld(); // make sure the camera matrix is updated
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      frustum.setFromProjectionMatrix(cameraViewProjectionMatrix)

      rooms.forEach(room => {
        const position = new THREE.Vector3(
          room.mesh.position.x + (room.config.width >> 1) * scale,
          room.mesh.position.y,
          room.mesh.position.z + (room.config.height >> 1) * scale,
        )
        const distance = position.distanceTo(camera.position)

        if (distance > settings.camera.far) {
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

        if (distance > settings.camera.far) {
          mesh.visible = false
        } else {
          if (!frustum.intersectsObject(g)) {
            mesh.visible = distance < 50
          } else {
            mesh.visible = true
          }
        }

        mesh.matrixAutoUpdate = mesh.visible
      }

      decorationObjects.forEach(mesh => {
        const distance = mesh.position.distanceTo(camera.position)

        if (distance > settings.camera.far >> 1) {
          mesh.visible = false
        } else {
          mesh.visible = frustum.intersectsObject(mesh)
        }

        mesh.matrixAutoUpdate = mesh.visible
      })

    },
  }
}