import * as THREE from "three";
import { RoomConfig } from "@/types";
import PolygonClipping from "polygon-clipping";

export function findLineCoordinates(rooms: RoomConfig[], padding: number) {
  const roomPoints = (room: RoomConfig) => {
    const p = padding;
    return [
      [room.x - p, room.y - p],
      [room.x + room.width + p, room.y - p],
      [room.x + room.width + p, room.y + room.height + p],
      [room.x - p, room.y + room.height + p],
    ];
  };

  const polygons = rooms.map((room) => {
    return [roomPoints(room)];
  });

  const polygon = PolygonClipping.union(...polygons);
  const lineCoordinates = polygon[0][0].map((coords) => ({
    x: coords[0],
    y: coords[1],
  }));

  let prevPoint = lineCoordinates[0];

  const points: { x: number; y: number; }[] = [];

  lineCoordinates.slice(1).forEach((point) => {
    const prevVector = new THREE.Vector2(prevPoint.x, prevPoint.y);
    const curVector = new THREE.Vector2(point.x, point.y);
    const distance = prevVector.distanceTo(curVector);

    const steps = Math.floor(distance / 1);

    for (let i = 0; i < 1; i += 1 / steps) {
      const newPosition = {
        x: prevVector.x + (curVector.x - prevVector.x) * i,
        y: prevVector.y + (curVector.y - prevVector.y) * i,
      };

      points.push(newPosition);
    }

    prevPoint = point;
  });

  return points;
}
