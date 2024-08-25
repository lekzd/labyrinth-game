import { scene } from "@/scene";
import { textureRepeat } from "@/utils/textureRepeat";
import {
  ColorRepresentation,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector2,
  Vector3
} from "three";

interface Props {
  texture: Texture;
  position: Vector3;
  size: Vector2;
  scale?: number;
  rotation?: number;
  color?: ColorRepresentation;
}

export const SpriteEffect = ({
  texture: initialTexture,
  position,
  size,
  scale = 1,
  rotation = 0,
  color
}: Props) => {
  const texture = textureRepeat(initialTexture, size.x, size.y, 1, 1);

  const material = new SpriteMaterial({
    map: texture,
    color
  });
  const sprite = new Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(scale, scale, scale);

  scene.add(sprite);

  return {
    update: (currentTile: number) => {
      const currentColumn = currentTile % size.x;
      const currentRow = Math.floor(currentTile / size.x);

      texture.offset.x = currentColumn / size.x;
      texture.offset.y = 1 - (currentRow + 1) / size.y;

      // texture.center.set(0.5, 0.5);

      // texture.rotation = rotation;
    },
    remove: () => {
      scene.remove(sprite);
    }
  };
};
