import { noise, random } from "@/utils/random.ts";
import { Tiles } from "@/config";

export const getWorld = (x: number, y: number, n = 25, k = 0.7) => {
  const ground = noise(x / n, y / n);
  const weapon = noise(x / (n * k * 0.1), y / (n * k * 0.1));
  const spawner = noise(x / (n * k * 0.025), y / (n * k * 0.025));

  const dungeons = noise(x / (n * k * 0.035), y / (n * k * 0.035));

  if (x === 0 && y === 0) return Tiles.Campfire;

  if (Math.sin(ground * 15) < -0.6) return Tiles.Road;

  if (spawner > 0.93 && ground < 0) return Tiles.Spawner;

  if (dungeons > 0.98 && ground < 0)
    return [Tiles.Stump, Tiles.MagicTree, Tiles.Grave, Tiles.MagicMushroom][(x + y) % 4];

  if (weapon > 0.985 && ground < 0) return Tiles.Weapon;

  if (ground < 0) return Tiles.Floor;

  return Tiles.Tree;
};
