import { State } from "../state"
import { Tiles } from "../types/Tiles"
import { random } from "../utils/random"
import { shuffle } from "../utils/shuffle"
import { something } from "../utils/something"
import { RoomConfig } from "./types"
import { drawRect, drawTiles, range } from "./utils"

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

  const hc = width >> 1
  const vc = height >> 1

  if (actions.includes(Tiles.NorthExit)) {
    // road
    drawRect(tiles, hc, 0, 1, vc, width, Tiles.Empty)
    // exit gap
    drawRect(tiles, hc - 1, 0, 3, 1, width, Tiles.Floor)
    tiles[getIndex(hc, 0)] = Tiles.NorthExit
  }

  if (actions.includes(Tiles.SouthExit)) {
    // road
    drawRect(tiles, hc, vc, 1, vc, width, Tiles.Empty)
    // exit gap
    drawRect(tiles, hc - 1, height - 1, 3, 1, width, Tiles.Floor)
    tiles[getIndex(hc, height - 1)] = Tiles.SouthExit
  }

  if (actions.includes(Tiles.WestExit)) {
    // road
    drawRect(tiles, 0, vc, hc, 1, width, Tiles.Empty)
    // exit gap
    drawRect(tiles, 0, vc - 1, 1, 3, width, Tiles.Floor)
    tiles[getIndex(0, vc)] = Tiles.WestExit
  }

  if (actions.includes(Tiles.EastExit)) {
    // road
    drawRect(tiles, hc, vc, hc, 1, width, Tiles.Empty)
    // exit gap
    drawRect(tiles, width - 1, vc - 1, 1, 3, width, Tiles.Floor)
    tiles[getIndex(width - 1, vc)] = Tiles.EastExit
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
  const roomStartX = Math.round((state.colls - ROOM_SIZE) / 2)
  const roomStartY = Math.round((state.rows - ROOM_SIZE) / 2)
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
      let isLast = i === length - 1
      let x = parentRoom.x
      let y = parentRoom.y
      const width = random(3, 8) * 2 + 1
      const height = random(3, 8) * 2 + 1
      const actions: Tiles[] = []
  
      if (action === Tiles.NorthExit) {
        x += (parentRoom.width - width) >> 1
        y -= height
        if (y < 0) {
          y = 0
          isLast = true
        }
        actions.push(Tiles.SouthExit)
        if (!isLast) {
          actions.push(Tiles.NorthExit)
        }
      }
  
      if (action === Tiles.SouthExit) {
        x += (parentRoom.width - width) >> 1
        y += parentRoom.height
        if (y > state.rows) {
          y = state.rows
          isLast = true
        }
        actions.push(Tiles.NorthExit)
        if (!isLast) {
          actions.push(Tiles.SouthExit)
        }
      }
  
      if (action === Tiles.WestExit) {
        y += (parentRoom.height - height) >> 1
        x -= width
        if (x < 0) {
          x = 0
          isLast = true
        }
        actions.push(Tiles.EastExit)
        if (!isLast) {
          actions.push(Tiles.WestExit)
        }
      }
  
      if (action === Tiles.EastExit) {
        y += (parentRoom.height - height) >> 1
        x += parentRoom.width
        if (x > state.colls) {
          x = state.colls
          isLast = true
        }
        actions.push(Tiles.WestExit)
        if (!isLast) {
          actions.push(Tiles.EastExit)
        }
      }

      const perpendicularExits = getPerpendicularExits(action)

      if (deep < 1 && random(0, 3) === 0) {
        actions.push(something(perpendicularExits))
      }
  
      const room = generateRoom({ id: getId(), width, height, actions, x, y })
  
      drawTiles(staticGrid, x, y, width, height, state.colls, room.tiles)
      rooms.push(room)

      perpendicularExits.forEach(exit => {
        if (actions.includes(exit)) {
          addSequence(room, exit, random(1, 5), deep + 1)
        }
      })

      parentRoom = room

      if (isLast) {
        break
      }
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

  return {
    staticGrid,
    rooms,
  }
}