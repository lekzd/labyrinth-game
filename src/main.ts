import './style.css'

import { generateCaves } from './generators/generateCaves'
import { generateRooms } from './generators/generateRooms'
import { Tiles } from './generators/types'
import { random } from './generators/utils'

const canvas = document.querySelector<HTMLCanvasElement>('#screen')!
const ctx = canvas.getContext('2d')!

const ROWS = 100
const COLLS = 100
const BRANCHES = random(3, 8)
const ROOM_SIZE = 12
const TILE = 7

const backgroundGrid = Array.from<number>({ length: ROWS * COLLS }).fill(Tiles.Wall)
const objectsGrid = Array.from<number>({ length: ROWS * COLLS }).fill(0)

generateRooms({
  COLLS,
  ROWS,
  ROOM_SIZE,
  backgroundGrid,
  objectsGrid,
  BRANCHES,
})

// generateCaves({
//   COLLS,
//   ROWS,
//   ROOM_SIZE,
//   backgroundGrid,
//   objectsGrid,
//   BRANCHES,
// })

// renderer
canvas.width = COLLS * TILE
canvas.height = ROWS * TILE

canvas.style.width = `${canvas.width}px`
canvas.style.height = `${canvas.height}px`

ctx.fillStyle = 'black'
ctx.fillRect(0, 0, canvas.width, canvas.height)

const COLORS = new Map([
  [Tiles.Floor, 'black'],
  [Tiles.Wall, 'grey'],
  [Tiles.NorthExit, 'black'],
  [Tiles.SouthExit, 'black'],
  [Tiles.WestExit, 'black'],
  [Tiles.EastExit, 'black'],
])

for (let i = 0; i < backgroundGrid.length; i++) {
  const x = i % COLLS
  const y = Math.floor(i / COLLS)

  ctx.fillStyle = COLORS.get(backgroundGrid[i]) ?? 'grey'
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
}