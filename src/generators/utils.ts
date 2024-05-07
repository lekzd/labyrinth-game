
export const range = (start: number, stop: number, step = 1): number[] =>
  Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)

export const drawRect = (grid: number[], x: number, y: number, w: number, h: number, colls: number, v: number) => {
  for (let i = 0; i < w * h; i++) {
    const dy = Math.floor(i / w)
    const dx = (i % w)
    const startOffset = (y * colls) + x + (dy * (colls - w))
    const index = startOffset + (dy * w) + dx

    grid[index] = v
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