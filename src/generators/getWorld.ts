import {noise, random} from "@/utils/random.ts";
import {Tiles} from "@/config";

const ptInCircle = (px: number, py: number, cx = 0, cy = 0, radius = 20) => {
  const dx = px - cx;
  const dy = py - cy;
  const distanceSquared = dx * dx + dy * dy;

  return distanceSquared <= radius * radius;
}

export const getWorld = (x: number, y: number, n = 25, k = 0.7) => {
  const ground = noise(x / n, y / n);
  const weapon = noise(x / (n * k * .1), y / (n * k * .1));
  const spawner = noise(x / (n * k * .025), y / (n * k * .025));

  const dungeons = noise(x / (n * k * .035), y / (n * k * .035));

  if (x === 0 && y === 0) return Tiles.Campfire;

  if (ptInCircle(x, y, 0, 0, 3)) return Tiles.Road;

  if (ptInCircle(x, y, 0, 0, 11)) {
    if ((x > -2 && x < 2) || (y > -2 && y < 2)) return Tiles.Road;
  }

  if (Math.sin(ground * 15) < -0.6) return Tiles.Road;

  if (ptInCircle(x, y)) return Tiles.Floor;

  if (spawner > .93 && ground < 0) return Tiles.Spawner;

  if (dungeons > .98 && ground < 0) return [Tiles.Stump, Tiles.MagicTree, Tiles.Grave][random(0, 2)];

  if (weapon > .985 && ground < 0) return Tiles.Weapon;

  if (ground < 0) return Tiles.Floor;

  return Tiles.Tree;
}