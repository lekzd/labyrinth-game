import * as THREE from "three";
import { frandom, noise } from "@/utils/random";
import { makeCtx } from "@/utils/makeCtx";
import { RoomConfig } from "@/types";
import { loads } from "@/loader";
import { textureRepeat } from "@/utils/textureRepeat";
import { getDistance } from "@/utils/getDistance";

const BACKGROUND_COLOR = `rgb(255,0,0)`;

export const createRoomTerrainCanvas = (
  room: RoomConfig,
  noiseFactor: number,
  tileSize: number
) => {
  const ctx = makeCtx(room.width * tileSize, room.height * tileSize);

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const baseColor = new THREE.Color(`#2b2e13`)

  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const absolutePoint = { x: room.x + x, z: room.y + y, y: 0 };
      const ground =
        getDistance({ x: 0, y: 0, z: 0 }, absolutePoint) > 8
          ? noise((room.x + x) / 25, (room.y + y) / 25)
          : -1;
      const shadowPower = ground < -0.6 ? 0 : Math.min(1, (ground + 0.5) * 5);

      const randomColor = baseColor.clone()
        .offsetHSL(
          frandom(-0.01, 0.01),
          frandom(-0.01, 0.01),
          frandom(-0.01, 0.01)
        )
        .lerp(new THREE.Color(`rgb(5, 6, 0)`), shadowPower);

      ctx.fillStyle = randomColor.getStyle();
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  return ctx.canvas;
};

export const createFloorMaterial = (room: RoomConfig) => {
  const canvas = createRoomTerrainCanvas(room, 1, 1);
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
    normalScale: new THREE.Vector2(10, 10),
    color: 0x777777,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    fog: true
  });
};
