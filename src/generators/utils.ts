export const random = (from: number, to: number) => {
  return (from + Math.floor(Math.random() * (to - from)))
}

export const frandom = (from: number, to: number) => {
  return (from + Math.random() * (to - from))
}

export const range = (start: number, stop: number, step = 1): number[] =>
  Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)

export const shuffle = <T = any>(array: T[]): T[] => {
  const result = array.slice(0)
  let i = result.length - 1
  while (i > 0) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
    i--
  }
  return result
}

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