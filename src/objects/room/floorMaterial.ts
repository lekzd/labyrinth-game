import * as THREE from "three";
import { Tiles } from "@/config";
import { frandom } from "@/utils/random";
import { makeCtx } from "@/utils/makeCtx";
import { RoomConfig } from "@/types";
import { loads } from "@/loader";
import { textureRepeat } from "@/utils/textureRepeat";

const BACKGROUND_COLOR = `rgb(255,0,0)`;

export const createRoomTerrainCanvas = (
  room: RoomConfig,
  noiseFactor: number,
  tileSize: number
) => {
  const r = (v: number) => frandom(-noiseFactor, noiseFactor);

  const getColor = (tile: Tiles) => {
    const noise = r(noiseFactor);
    switch (tile) {
      case Tiles.Empty:
      case Tiles.NorthExit:
      case Tiles.SouthExit:
      case Tiles.WestExit:
      case Tiles.EastExit:
        return `rgb(${20 + noise},${10 + noise},0)`;
      case Tiles.Wall:
        return `rgb(0,0,0)`;
      default:
        return `rgb(${2 + noise},${4 + noise},0)`;
    }
  };

  const ctx = makeCtx(room.width * tileSize, room.height * tileSize);

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  room.tiles.forEach((tile, i) => {
    const x = (i % room.width) * tileSize;
    const y = Math.floor(i / room.width) * tileSize;

    ctx.fillStyle = getColor(tile);
    ctx.fillRect(x, y, tileSize, tileSize);
  });

  return ctx.canvas;
};

export const createFloorMaterial = (room: RoomConfig) => {
  const canvas = createRoomTerrainCanvas(room, 5, 3);
  const texture = new THREE.CanvasTexture(canvas);

  return new THREE.MeshStandardMaterial({
    map: texture,
    normalMap: textureRepeat(
      loads.texture["ground_forest_bump.jpg"]!,
      1,
      1,
      room.width,
      room.height
    ),
    normalMapType: 1,
    color: 0x222222,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    fog: true
  });
};
