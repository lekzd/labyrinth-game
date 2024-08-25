import React, { useEffect, useMemo, useRef } from "react";
import { Meta, StoryObj } from "@storybook/react";
import { initState } from "@/state";
import { generateRooms } from "./generateRooms";
import { Tiles } from "@/config";
import  {updateSeed } from "@/utils/random.ts";

const ROOM_SIZE = 13;

const getColor = (tile: Tiles) => {
  switch (tile) {
    case Tiles.NorthExit:
    case Tiles.SouthExit:
    case Tiles.WestExit:
    case Tiles.EastExit:
    case Tiles.Road:
      return `#651218`;
    case Tiles.Wall:
      return `#2f4e2f`;
    case Tiles.PuzzleHandler:
      return `#ff9d00`;
    case Tiles.Spawner:
      return `#b700ff`;
    case Tiles.Weapon:
      return `#00FF00`;
    case Tiles.Floor:
      return `#555555`;
    default:
      return `#777777`;
  }
};

const PreviewCanvas = ({ rows, channel, colls, withTiles }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  const state = useMemo(() => {
    const state = initState({ rows, colls });
    updateSeed(channel)
    state.setState(
      generateRooms({
        state,
        ROOM_SIZE,
      })
    );
    return state;
  }, [rows, channel, colls])

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const tileSize = 3;

    canvas.width = colls * tileSize;
    canvas.height = rows * tileSize;

    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const key in state.rooms) {
      const room = state.rooms[key];

      // console.log(room)

      ctx.fillStyle = 'gray';
      ctx.fillRect(room.x * tileSize, room.y * tileSize, room.width * tileSize, room.height * tileSize);

      if (withTiles) {
        // Проходимся по координатам
        for (let y = 0; y < room.height; y++) {
          for (let x = 0; x < room.width; x++) {
            const tile = room.tiles[y * room.height + x];
            const color = getColor(tile);

            if (color) {
              ctx.fillStyle = getColor(tile);
              ctx.fillRect(
                (room.x + x) * tileSize,
                (room.y + y) * tileSize,
                tileSize,
                tileSize
              );
            }
          }
        }
        }
    }
  }, [state, withTiles, ref]);

  return <canvas ref={ref} />;
};

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Generators/Rooms",
  component: PreviewCanvas,
} satisfies Meta<typeof PreviewCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    rows: 150,
    colls: 150,
    withTiles: true,
    channel: '',
  },
};
