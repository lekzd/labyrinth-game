import { Tiles } from "../types/Tiles"
import { frandom } from "../utils/random"
import { shuffle } from "../utils/shuffle"
import { drawRect, range } from "./utils"

export const generateCaves = ({
  COLLS,
  ROWS,
  ROOM_SIZE,
  backgroundGrid,
  objectsGrid,
  BRANCHES,
}: any) => {
  // draw central room
  const roomStartX = Math.floor((COLLS - ROOM_SIZE) / 2)
  const roomStartY = Math.floor((ROWS - ROOM_SIZE) / 2)

  drawRect(backgroundGrid, roomStartX, roomStartY, ROOM_SIZE, ROOM_SIZE, COLLS, Tiles.Floor)


  // draw branches
  const cx = COLLS >> 1
  const cy = ROWS >> 1
  const BRANCH_WIDTH = 4
  const branches = shuffle(range(2, 25))

  for (let i = 0; i < branches.length; i++) {
    const baseAngle = (i / BRANCHES) * (Math.PI * 2)
    let angle = baseAngle

    const length = branches[i]

    for (let i = 0; i < length; i++) {
      angle += frandom(-0.15, 0.15) * (i / length)
      const dx = (cx - (BRANCH_WIDTH >> 1)) + Math.round((Math.cos(angle) * (2 * i)))
      const dy = (cy - (BRANCH_WIDTH >> 1)) + Math.round((Math.sin(angle) * (2 * i)))

      drawRect(backgroundGrid, dx, dy, BRANCH_WIDTH, BRANCH_WIDTH, COLLS, Tiles.Floor)
    }
  }
}