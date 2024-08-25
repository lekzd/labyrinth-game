
export const range = (start: number, stop: number, step = 1): number[] =>
  Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)

const ort = (a, b) => a - b;

export const drawRect = ({ width, height, tiles = [] }, [x1, y1], [x2, y2], v: number) => {
  let [xMin, xMax] = [x1, x2].sort(ort);
  let [yMin, yMax] = [y1, y2].sort(ort);

  if (xMin === xMax) xMax+=1;
  if (yMin === yMax) yMax+=1;

  for (let y = yMin; y < yMax; y++) {
    for (let x = xMin; x < xMax; x++) {
      if (x < 0 || y < 0 || x > width || y > height) continue;
      const index = y * width + x;
      tiles[index] = v;
    }
  }
}

export const drawTiles = (grid: number[], x: number, y: number, w: number, h: number, colls: number, data: number[]) => {
  for (let i = 0; i < w * h; i++) {
    const dy = Math.floor(i / w)
    const dx = (i % w)
    const startOffset = (y * colls) + x + (dy * (colls - w))
    const index = startOffset + (dy * w) + dx

    grid[index] = data[i]
  }
}