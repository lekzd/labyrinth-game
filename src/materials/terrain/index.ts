import { Tiles } from "@/types";
import { State } from "@/state";
import { frandom } from "@/utils/random";
import { makeCtx } from "@/utils/makeCtx";

const BACKGROUND_COLOR = `rgb(1,2,0)`;

export const createTerrainCanvas = (
  state: State,
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

  const ctx = makeCtx(state.colls * tileSize, state.rows * tileSize);

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  state.staticGrid.forEach((tile, i) => {
    const x = (i % state.colls) * tileSize;
    const y = Math.floor(i / state.colls) * tileSize;

    ctx.fillStyle = getColor(tile);
    ctx.fillRect(
      x - Math.round(tileSize / 2),
      y - Math.round(tileSize / 2),
      tileSize,
      tileSize
    );
  });

  return ctx.canvas;
};
