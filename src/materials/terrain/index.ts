import * as THREE from 'three';
import { Tiles } from "../../types/Tiles";
import { State } from "../../state";
import { frandom } from '../../utils/random';
import { makeCtx } from '../../utils/makeCtx';

const BACKGROUND_COLOR = `rgb(1,2,0)`;

const r = (v: number) => frandom(v-3,v+3)

const getColor = (tile: Tiles) => {
  const noise = r(.4)
  switch (tile) {
    case Tiles.Empty:
    case Tiles.NorthExit:
    case Tiles.SouthExit:
    case Tiles.WestExit:
    case Tiles.EastExit:
      return `rgb(${20+noise},${10+noise},0)`
    case Tiles.Wall:
      return `rgb(0,0,0)`
    default:
      return `rgb(${10+noise},${20+noise},0)`
  }
} 

export const createTerrainMaterial = (state: State) => {
  const tileSize = 3
  const ctx = makeCtx(state.colls * tileSize, state.rows * tileSize)

  ctx.fillStyle = BACKGROUND_COLOR
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  state.staticGrid.forEach((tile, i) => {
    const x = (i % state.colls) * tileSize
    const y = Math.floor(i / state.colls) * tileSize

    ctx.fillStyle = getColor(tile)
    ctx.fillRect(x - (tileSize >> 1), y - (tileSize >> 1), tileSize, tileSize)
  })

  const texture = new THREE.CanvasTexture(ctx.canvas);

  return new THREE.MeshBasicMaterial({ map: texture, color: 0x444444 });
}