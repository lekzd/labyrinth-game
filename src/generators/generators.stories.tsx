import React, { useEffect, useRef } from "react";
import { Meta, StoryObj } from "@storybook/react";
import { initState } from "@/state";
import { generateRooms } from "./generateRooms";
import { Tiles } from "@/config";

const ROOM_SIZE = 13;

const getColor = (tile: Tiles) => {
  switch (tile) {
    case Tiles.NorthExit:
    case Tiles.SouthExit:
    case Tiles.WestExit:
    case Tiles.EastExit:
      return `rgb(${20},${10},0)`;
    case Tiles.Wall:
      return `rgb(0,0,0)`;
    case Tiles.PuzzleHandler:
      return `#ff9d00`;
    case Tiles.Weapon:
      return `#00FF00`;
    case Tiles.Floor:
      return `#555555`;
    case Tiles.Empty:
      return "brown";
    default:
      return `#777777`;
  }
};

const PreviewCanvas = ({ rows, colls }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const state = initState({ rows, colls });
    state.setState(
      generateRooms({
        state,
        ROOM_SIZE,
      })
    );

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const tileSize = 5;

    canvas.width = colls * tileSize;
    canvas.height = rows * tileSize;

    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    state.staticGrid.forEach((tile, i) => {
      const x = (i % colls) * tileSize;
      const y = Math.floor(i / colls) * tileSize;
      ctx.fillStyle = getColor(tile);
      ctx.fillRect(x, y, tileSize, tileSize);
    });
  }, [rows, colls, ref]);

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
  },
};
