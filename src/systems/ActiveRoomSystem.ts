import { Room } from '../objects/room/index.ts';
import { MapObject } from '../types/MapObject.ts';
import { currentPlayer } from '../main.ts';
import { scale } from '../state.ts';

type Rect = {
  left: number
  top: number
  right: number
  bottom: number
}

const isInside = (x: number, y: number, rect: Rect) => x > rect.left && x < rect.right && y > rect.top && y < rect.bottom;

export const ActiveRoomSystem = () => {
  const roomRef: React.MutableRefObject<ReturnType<typeof Room> | null> = {
    current: null,
  }

  const activeObjectRef: React.MutableRefObject<MapObject | null> = {
    current: null,
  }

  const findActiveObject = (objects: Record<string, MapObject>) => {
    for (const id in objects) {
      if (currentPlayer.activeObjectId === id) {
        return objects[id]
      }
    }

    return null
  }

  const isObjectInsideRoom = (object: MapObject, room: ReturnType<typeof Room>) => {
    return isInside(
      object.mesh.position.x,
      object.mesh.position.z,
      {
        left: room.config.x * scale,
        top: room.config.y * scale,
        right: (room.config.x + room.config.width) * scale,
        bottom: (room.config.y + room.config.height) * scale,
      }
    )
  }

  const findObjectsInsideRoom = (objects: Record<string, MapObject>, room: ReturnType<typeof Room>) => {
    const result: MapObject[] = []

    for (const id in objects) {
      if (isObjectInsideRoom(objects[id], room)) {
        result.push(objects[id])
      }
    }

    return result
  }

  return {
    roomRef,
    activeObjectRef,
    update: (
      rooms: ReturnType<typeof Room>[],
      objects: Record<string, MapObject>,
    ) => {
      const activeObject = findActiveObject(objects)

      if (activeObject) {
        activeObjectRef.current = activeObject
        roomRef.current = rooms.find(room => {
          return isObjectInsideRoom(activeObject, room)
        }) ?? null

        if (roomRef.current) {
          const objectsInside = findObjectsInsideRoom(objects, roomRef.current)
          roomRef.current.update(objectsInside)
        }
      } else {
        roomRef.current = null
      }
    },
  }
}