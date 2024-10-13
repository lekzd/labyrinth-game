import React, { useEffect, useRef } from "react";
import { Meta, StoryObj } from "@storybook/react";
import { Tiles } from "@/config";
import { updateSeed } from "@/utils/random.ts";
import { getWorld } from "@/generators/getWorld.ts";

const getColor = (tile: Tiles) => {
  switch (tile) {
    case Tiles.NorthExit:
    case Tiles.SouthExit:
    case Tiles.WestExit:
    case Tiles.EastExit:
    // case Tiles.Road:
      return `#651218`;
    case Tiles.Stump:
      return `#1a509f`;
    case Tiles.MagicTree:
    case Tiles.Grave:
      return `#5affe1`;
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

const PreviewCanvas = ({ radius, x: cx = 0, y: cy = 0, channel }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    updateSeed(channel)
  }, [channel]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const tileSize = 3;

    canvas.width = 2 * radius * tileSize;
    canvas.height = 2 * radius * tileSize;

    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < cy + 2 * radius; y++) {
      for (let x = 0; x < cx + 2 * radius; x++) {
        const tail = getWorld(cx + (x - radius), cy + (y - radius));

        ctx.fillStyle = getColor(tail);
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

  }, [channel, cx, cy, radius]);

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
    radius: 100,
    channel: '',
    x: 0,
    y: 0,
  },
};
