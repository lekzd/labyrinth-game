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
      return `#651218`;
    case Tiles.MagicTree:
      return `#9f1a98`;
    case Tiles.Grave:
      return `#1a509f`;
    case Tiles.MagicMushroom:
      return `#2fe517`;
    case Tiles.Stump:
      return `#1dbc82`;
    case Tiles.Wall:
      return `#2f4e2f`;
    case Tiles.PuzzleHandler:
      return `#ff9d00`;
    case Tiles.Spawner:
      return `#b700ff`;
    case Tiles.Weapon:
      return `#00FF00`;
    case Tiles.Floor:
      return `#53a557`;
    case Tiles.Road:
      return `#c8c56d`;
    case Tiles.Tree:
      return `#072d0c`;
    case Tiles.Campfire:
      return `#ff0000`;
    default:
      return `#072d0c`;
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

    for (let y = 0; y < Math.abs(cy) + 2 * radius; y++) {
      for (let x = 0; x < Math.abs(cx) + 2 * radius; x++) {
        const tile = getWorld(cx + (x - radius), cy + (y - radius));

        ctx.fillStyle = getColor(tile);

        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let y = 0; y < Math.abs(cy) + 2 * radius; y++) {
      for (let x = 0; x < Math.abs(cx) + 2 * radius; x++) {
        const tile = getWorld(cx + (x - radius), cy + (y - radius));

        ctx.fillStyle = getColor(tile);

        if ([Tiles.Campfire, Tiles.MagicMushroom, Tiles.Grave, Tiles.Stump, Tiles.MagicTree].includes(tile)) {
          ctx.fillRect((x - 10) * tileSize, (y - 10) * tileSize, 20 * tileSize, 20 * tileSize);
          ctx.fillStyle = `#000000`;
          ctx.fillText(Tiles[tile], x * tileSize, y * tileSize);
          ctx.fillText(`${(cx + (x - radius)) * 10}, ${cy + (y - radius) * 10}`, x * tileSize, y * tileSize + 10);
        }
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
