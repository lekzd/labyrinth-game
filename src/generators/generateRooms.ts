import { Tiles } from "./types"
import { drawRect, drawTiles, random, range, shuffle } from "./utils"

type RoomConfig = {
  width: number
  height: number
  actions: Tiles[]
  tiles: Tiles[]
  x: number
  y: number
}

const EXITS = [
  Tiles.NorthExit,
  Tiles.EastExit,
  Tiles.SouthExit,
  Tiles.WestExit,
]

const generateRoom = ({
  width,
  height,
  actions,
  x, y,
}: Omit<RoomConfig, 'tiles'>): RoomConfig => {
  const tiles = Array.from<Tiles>({ length: width * height }).fill(Tiles.Floor)

  const getIndex = (x: number, y: number) => {
    return (y * width) + x
  }

  drawRect(tiles, 0, 0, width, height, width, Tiles.Wall)
  drawRect(tiles, 1, 1, width - 2, height - 2, width, Tiles.Floor)

  if (actions.includes(Tiles.NorthExit)) {
    tiles[getIndex(width >> 1, 0)] = Tiles.NorthExit
  }

  if (actions.includes(Tiles.SouthExit)) {
    tiles[getIndex(width >> 1, height - 1)] = Tiles.SouthExit
  }

  if (actions.includes(Tiles.WestExit)) {
    tiles[getIndex(0, height >> 1)] = Tiles.WestExit
  }

  if (actions.includes(Tiles.EastExit)) {
    tiles[getIndex(width - 1, height >> 1)] = Tiles.EastExit
  }

  return {
    width,
    height,
    actions,
    tiles,
    x, y
  }
}

const getPerpendicularExits = (from: Tiles): Tiles[] => {
  if (from === Tiles.NorthExit || from === Tiles.SouthExit) {
    return [Tiles.EastExit, Tiles.WestExit]
  }

  return [Tiles.NorthExit, Tiles.SouthExit]
}

export const generateRooms = ({
  COLLS,
  ROWS,
  ROOM_SIZE,
  backgroundGrid,
  objectsGrid,
  BRANCHES,
}: any) => {
  // draw central room
  const roomStartX = (COLLS - ROOM_SIZE) >> 1
  const roomStartY = (ROWS - ROOM_SIZE) >> 1
  const centralRoom = generateRoom({
    width: ROOM_SIZE,
    height: ROOM_SIZE,
    x: roomStartX,
    y: roomStartY,
    actions: [
      Tiles.NorthExit,
      Tiles.EastExit,
      Tiles.SouthExit,
      Tiles.WestExit,
    ]
  })

  drawTiles(backgroundGrid, roomStartX, roomStartY, centralRoom.width, centralRoom.height, COLLS, centralRoom.tiles)

  // draw branches
  const branches = shuffle(range(2, 6))

  const addSequence = (parentRoom: RoomConfig, action: Tiles, length: number, deep: number) => {
    for (let i = 0; i < length; i++) {
      let x = parentRoom.x
      let y = parentRoom.y
      const width = random(5, 15)
      const height = random(5, 15)
      const actions: Tiles[] = []
  
      if (action === Tiles.NorthExit) {
        x += (parentRoom.width - width) >> 1
        y -= height - 1
        actions.push(Tiles.SouthExit)
      }
  
      if (action === Tiles.SouthExit) {
        x += (parentRoom.width - width) >> 1
        y += parentRoom.height - 1
        actions.push(Tiles.NorthExit)
      }
  
      if (action === Tiles.WestExit) {
        y += (parentRoom.height - height) >> 1
        x -= width - 1
        actions.push(Tiles.EastExit)
      }
  
      if (action === Tiles.EastExit) {
        y += (parentRoom.height - height) >> 1
        x += parentRoom.width - 1
        actions.push(Tiles.WestExit)
      }
  
      const room = generateRoom({ width, height, actions, x, y })
  
      drawTiles(backgroundGrid, x, y, width, height, COLLS, room.tiles)

      if (deep < 1 && random(0, 3) === 0) {
        addSequence(room, shuffle(getPerpendicularExits(action))[0], random(1, 5), deep + 1)
      }

      parentRoom = room
    }
  }

  for (let i = 0; i < centralRoom.actions.length; i++) {
    let parentRoom = centralRoom
    const action = parentRoom.actions[i]
    const length = branches[i]

    if (!EXITS.includes(action)) {
      continue
    }

    addSequence(parentRoom, action, length, 0)
  }
  
}