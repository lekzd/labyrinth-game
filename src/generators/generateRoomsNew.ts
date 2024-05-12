import { State } from "../state"
import { Tiles } from "../types/Tiles"
import { makeCtx } from "../utils/makeCtx"
import { random } from "../utils/random"
import { shuffle } from "../utils/shuffle"
import { something } from "../utils/something"
import { RoomConfig } from "./types"
import { drawRect, drawTiles, range } from "./utils"

import PolygonClipping from 'polygon-clipping';

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

const getDistance = (p1: PolygonClipping.Pair, p2: PolygonClipping.Pair) => {
  return Math.sqrt( Math.pow((p1[0] - p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2) );
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

  const chunkSize = 15

  const { rooms, rows, colls } = state
  const polygons = []

  for (let y = 0; y < rows; y += chunkSize) {
    for (let x = 0; x < colls; x += chunkSize) {
      const width = random(chunkSize * 0.2, chunkSize * 1.1)
      const height = random(chunkSize * 0.2, chunkSize * 1.1)

      const left = x + Math.round((chunkSize - width) / 2)
      const top = y + Math.round((chunkSize - height) / 2)

      polygons.push([[
        [left, top],
        [left + width, top],
        [left + width, top + height],
        [left, top + height],
      ]])
    }
  }

  polygons.push([[
    [roomStartX, roomStartY],
    [roomStartX + ROOM_SIZE, roomStartY],
    [roomStartX + ROOM_SIZE, roomStartY + ROOM_SIZE],
    [roomStartX, roomStartY + ROOM_SIZE],
  ]])

  const mergedPolygons = PolygonClipping.union(...polygons)

  mergedPolygons.forEach(polygons => {
    const [polygon] = polygons
    polygon.forEach(point => {
      point[0] = Math.min(Math.max(point[0], 0), colls)
      point[1] = Math.min(Math.max(point[1], 0), rows)
    })
    const xValues = polygon.map(p => p[0])
    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)

    const yValues = polygon.map(p => p[1])
    const minY = Math.min(...yValues)
    const maxY = Math.max(...yValues)

    const x = minX
    const y = minY
    const width = maxX - minX + 1
    const height = maxY - minY + 1

    const actions: Tiles[] = []

    const ctx = makeCtx(width, height)

    ctx.strokeStyle = 'rgb(255,0,0)'
    ctx.fillStyle = 'rgb(0,255,0)'

    ctx.translate(-minX + 0.5, -minY + 0.5)

    ctx.moveTo(polygon[0][0], polygon[0][1])

    polygon.slice(1).forEach(point => {
      ctx.lineTo(point[0], point[1])
    })

    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // console.log('_debug', ctx.canvas.toDataURL())

    const imageData = ctx.getImageData(0, 0, width, height)
    const tiles = Array(width * height).fill(-1)

    let tileId = 0

    const room = {
      id: getId(),
      width,
      height,
      actions,
      polygon,
      tiles,
      x, y
    }

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i]; // red
      const g = imageData.data[i + 1]; // green
      const b = imageData.data[i + 2]; // blue
      const a = imageData.data[i + 3]; // alpha

      if (a !== 0) {
        if (r === 255) {
          tiles[tileId] = Tiles.Wall
        } else if (g === 255) {
          tiles[tileId] = Tiles.Floor
        }
      }

      tileId++
    }

    rooms.push(room)
  })

  // make connections

  rooms.slice(0,1).forEach(room => {
    const polygon = room.polygon as PolygonClipping.Pair[]

    const findMinValues = (a: RoomConfig, b: RoomConfig, v: 'x' | 'y', v2: 'width' | 'height') => {
      const aStart = a[v]
      const bStart = b[v]
      const aEnd = a[v] + a[v2]
      const bEnd = b[v] + b[v2]
      return Math.min(
        Math.abs(aStart - bStart),
        Math.abs(aEnd - bStart),
        Math.abs(aStart - bEnd),
        Math.abs(aEnd - bEnd),
      )
    }

    const closestRooms = rooms
      .filter(r => r.id !== room.id)
      .sort((a, b) => {
        const aMinX = findMinValues(a, b, 'x', 'width')
        const aMinY = findMinValues(a, b, 'y', 'height')
        
        const bMinX = findMinValues(b, a, 'x', 'width')
        const bMinY = findMinValues(b, a, 'y', 'height')

        return getDistance([aMinX, aMinY], [bMinX, bMinY])
      })
      .slice(0, 4)
      .forEach(b => {
        const a = room
        const aMinX = findMinValues(a, b, 'x', 'width')
        const aMinY = findMinValues(a, b, 'y', 'height')
        
        const bMinX = findMinValues(b, a, 'x', 'width')
        const bMinY = findMinValues(b, a, 'y', 'height')

        const aDimensions = {
          x: a.x,
          y: a.y,
          right: a.x + a.width,
          bottom: a.y + a.height,
        }

        const bDimensions = {
          x: b.x,
          y: b.y,
          right: b.x + b.width,
          bottom: b.y + b.height,
        }

        const fieldX = Math.abs(aDimensions.right - bDimensions.x) > Math.abs(aDimensions.x - bDimensions.right) ? 'x' : 'right'
        const fieldY = Math.abs(aDimensions.bottom - bDimensions.y) > Math.abs(aDimensions.y - bDimensions.bottom) ? 'y' : 'bottom'

        const x = fieldX === 'right' ? bDimensions[fieldX] : aDimensions[fieldX]
        const y = fieldY === 'bottom' ? bDimensions[fieldY] : aDimensions[fieldY]
        const isVertical = Math.abs(x - bMinX) > Math.abs(y - bMinY)

        const width = isVertical
          ? 3 //vertical
          : Math.abs(x - bMinX) // horizontal

        const height = isVertical
          ? Math.abs(y - bMinY) //vertical
          : 3 // horizontal
        
        const actions: Tiles[] = []

        const connectionRoom = generateRoom({
          id: getId(),
          width,
          height,
          actions,
          x, y,
        })

        console.log('_debug connectionRoom', connectionRoom)

        connectionRoom.connection = b.id

        // rooms.push(connectionRoom)
      })

    console.log('_debug', room, closestRooms)
  })

  return {
    rooms,
  }
}