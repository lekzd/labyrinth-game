import {noise} from "@/utils/random.ts";
import {Tiles} from "@/config";

const ptInCircle = ([px, py], [cx, cy] = [0, 0], radius = 20) => {
  const dx = px - cx;
  const dy = py - cy;
  const distanceSquared = dx * dx + dy * dy;

  return distanceSquared <= radius * radius;
}

export const getWorld = (x, y, n = 25, k = 0.7) => {
  const ground = noise(x / n, y / n);
  const weapon = noise(x / (n * k * .1), y / (n * k * .1));
  const spawner = noise(x / (n * k * .025), y / (n * k * .025));

  if (x === 0 && y === 0) return Tiles.Campfire;

  if (ptInCircle([x, y])) return Tiles.Floor;

  if (spawner > .93 && ground < 0) return Tiles.Spawner;

  if (weapon > .985 && ground < 0) return Tiles.Weapon;

  if (ground < 0) return Tiles.Floor;

  return Tiles.Tree;
}