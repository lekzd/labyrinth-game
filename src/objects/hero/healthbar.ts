import * as THREE from 'three';
import { makeCtx } from '@/utils/makeCtx';
import {isEqual} from "@/utils/isEqual.ts";
import { StateEntityProps } from '@/entities/StateEntity';

const createTexture = () => {
  const context = makeCtx(64, 16);

  return new THREE.CanvasTexture(context.canvas);
}

const updateTexture = (sprite: THREE.Sprite, percent: number, color: string) => {
  const texture = sprite.material.map!;
  const ctx = getCanvasCtx(texture);
  const canvas = ctx.canvas;
  const fill = Math.max(0, Math.min(100, percent));

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = color;
  ctx.fillRect(2, 2, (canvas.width - 4) * (fill / 100), canvas.height - 4);

  // Перезаливаем ту же текстуру, а не создаём новую на каждое изменение
  texture.needsUpdate = true;
}

function createSprite({ texture = createTexture(), scale = 0.05, pos = 16 } = {}) {
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMaterial);

  const size = 0.25 / scale;

  sprite.scale.set(6 * size, size, 6 * size); // Настройка размера спрайта
  sprite.position.set(0, pos / scale, 0); // Настройка позиционирования

  return sprite;
}

const getCanvasCtx = (texture: THREE.Texture) => {
  const canvas = texture.source.data as HTMLCanvasElement;
  return canvas.getContext('2d')!;
}

export const HealthBar = (props: StateEntityProps, target) =>  {
  let state = {}

  const healthSprite = createSprite({ scale: target.scale.x, pos: 16 }); // 75% здоровья
  const manaSprite = createSprite({ scale: target.scale.x, pos: 15.75 });

  // TODO: model texture
  target.add(healthSprite);
  target.add(manaSprite);

  const initialHealth = props.health;
  const initialMana = props.mana;

  const root = {
    update: ({ health, mana }: StateEntityProps) => {
      if (isEqual(state, { health, mana })) return;

      updateTexture(healthSprite, health / initialHealth * 100, '#ff0000');
      updateTexture(manaSprite, mana / initialMana * 100, '#3713dd');

      state = { health, mana }
    },
    dispose: () => {
      for (const sprite of [healthSprite, manaSprite]) {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
    }
  }

  root.update(props);

  return root;
}