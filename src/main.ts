import './style.css'
import render from './render.ts';

import { generateRooms } from './generators/generateRooms'
import { Tiles } from './generators/types'
import { random } from './generators/utils'

const ROWS = 100
const COLLS = 100
const BRANCHES = random(3, 8)
const ROOM_SIZE = 12

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

for (let i = 0; i < backgroundGrid.length; i++) {
  const x = i % COLLS
  const y = Math.floor(i / COLLS)

  render.block(
    x,
    y,
    1,
    backgroundGrid[i],
  )
}

render.ground(ROWS, COLLS)