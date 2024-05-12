import React, {useEffect, useRef} from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { initState } from '../state';
import { generateRooms } from './generateRoomsNew';
import { Tiles } from '../types/Tiles';

const ROOM_SIZE = 13

const getColor = (tile: Tiles) => {
  switch (tile) {
    case Tiles.Empty:
    case Tiles.NorthExit:
    case Tiles.SouthExit:
    case Tiles.WestExit:
    case Tiles.EastExit:
      return `rgb(${20},${10},0)`
    case Tiles.Wall:
      return `rgb(0,0,0)`
    case Tiles.Floor: 
      return `rgb(${10},${20},0)`
    default:
      return 'transparent'
  }
} 

const PreviewCanvas = ({ rows, colls }) => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const state = initState({ rows, colls })
    state.setState(
      generateRooms({
        state,
        ROOM_SIZE,
      })
    )

    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const tileSize = 5

    canvas.width = colls * tileSize
    canvas.height = rows * tileSize

    canvas.style.width = `${canvas.width}px`
    canvas.style.height = `${canvas.height}px`

    ctx.fillStyle = '#333333'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const chunk = 12.5

    for (let y = 0; y < colls / chunk; y++) {
      ctx.fillStyle = 'blue'
      ctx.fillRect(0, (y * (chunk) + (chunk >> 1)) * tileSize, canvas.width * tileSize, 1 * tileSize)
    }

    for (let x = 0; x < rows / chunk; x++) {
      ctx.fillStyle = 'blue'
      ctx.fillRect((x * chunk  + (chunk >> 1)) * tileSize, 0, 1 * tileSize, canvas.height * tileSize)
    }

    state.rooms.forEach(room => {
      room.tiles.forEach((tile, i) => {
        const x = room.x + (i % room.width)
        const y = room.y + Math.floor(i / room.width)

        ctx.fillStyle = room.connection ? 'red' : getColor(tile)
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
      })

      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.fillText(room.id.toString(), (room.x + (room.width >> 1)) * tileSize, (room.y + (room.height >> 1)) * tileSize)
    })
  }, [rows, colls, ref])

  return (
    <canvas ref={ref} />
  )
}

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Generators/Rooms',
  component: PreviewCanvas,
} satisfies Meta<typeof PreviewCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    rows: 150,
    colls: 150,
  },
};
