import { State } from "../state"
import { RoomConfig, Tiles } from "./types"
import { drawRect, drawTiles, random, range, shuffle } from "./utils"

const EXITS = [
  Tiles.NorthExit,
  Tiles.EastExit,
  Tiles.SouthExit,
  Tiles.WestExit,
]

let id = 0
const getId = () => id++

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
    drawRect(tiles, width >> 1, 0, 1, height >> 1, width, Tiles.Empty)
    tiles[getIndex(width >> 1, 0)] = Tiles.NorthExit
  }

  if (actions.includes(Tiles.SouthExit)) {
    drawRect(tiles, width >> 1, height >> 1, 1, height >> 1, width, Tiles.Empty)
    tiles[getIndex(width >> 1, height - 1)] = Tiles.SouthExit
  }

  if (actions.includes(Tiles.WestExit)) {
    drawRect(tiles, 0, height >> 1, width >> 1, 1, width, Tiles.Empty)
    tiles[getIndex(0, height >> 1)] = Tiles.WestExit
  }

  if (actions.includes(Tiles.EastExit)) {
    drawRect(tiles, width >> 1, height >> 1, width >> 1, 1, width, Tiles.Empty)
    tiles[getIndex(width - 1, height >> 1)] = Tiles.EastExit
  }

  return {
    id: getId(),
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

type GeneratorConfig = {
  state: State
  ROOM_SIZE: number
}

export const generateRooms = ({
  state,
  ROOM_SIZE,
}: GeneratorConfig) => {
  // draw central room
  const roomStartX = (state.colls - ROOM_SIZE) >> 1
  const roomStartY = (state.rows - ROOM_SIZE) >> 1
  const centralRoom = generateRoom({
    id: getId(),
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

  const { staticGrid, rooms } = state

  drawTiles(staticGrid, roomStartX, roomStartY, centralRoom.width, centralRoom.height, state.colls, centralRoom.tiles)

  rooms.push(centralRoom)

  // draw branches
  const branches = shuffle(range(2, 6))

  const addSequence = (parentRoom: RoomConfig, action: Tiles, length: number, deep: number) => {
    for (let i = 0; i < length; i++) {
      let x = parentRoom.x
      let y = parentRoom.y
      const width = random(3, 8) * 2
      const height = random(3, 8) * 2
      const actions: Tiles[] = []
  
      if (action === Tiles.NorthExit) {
        x += (parentRoom.width - width) >> 1
        y -= height - 1
        actions.push(Tiles.SouthExit)
        actions.push(Tiles.NorthExit)
      }
  
      if (action === Tiles.SouthExit) {
        x += (parentRoom.width - width) >> 1
        y += parentRoom.height - 1
        actions.push(Tiles.NorthExit)
        actions.push(Tiles.SouthExit)
      }
  
      if (action === Tiles.WestExit) {
        y += (parentRoom.height - height) >> 1
        x -= width - 1
        actions.push(Tiles.EastExit)
        actions.push(Tiles.WestExit)
      }
  
      if (action === Tiles.EastExit) {
        y += (parentRoom.height - height) >> 1
        x += parentRoom.width - 1
        actions.push(Tiles.WestExit)
        actions.push(Tiles.EastExit)
      }
  
      const room = generateRoom({ id: getId(), width, height, actions, x, y })
  
      drawTiles(staticGrid, x, y, width, height, state.colls, room.tiles)
      rooms.push(room)

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

  state.setState({
    staticGrid,
    rooms,
  })
  
}