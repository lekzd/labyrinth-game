import * as THREE from 'three';
import { makeCtx } from '../../utils/makeCtx';

const createTexture = () => {
  const context = makeCtx(64, 16);

  return new THREE.CanvasTexture(context.canvas);
}

const updateTexture = (ctx: CanvasRenderingContext2D, percent: number, color: string) => {
  const canvas = ctx.canvas

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = color;
  ctx.fillRect(2, 2, (canvas.width - 4) * (percent / 100), canvas.height - 4);
}

function createSprite(texture = createTexture()) {
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(30, 5, 30); // Настройка размера спрайта

  return sprite;
}

const getCanvasCtx = (texture: THREE.Texture) => {
  const canvas = texture.source.data;
  return canvas.getContext('2d');
}

export const HealthBar = ({ health, mana }, target) =>  {
  const healthSprite = createSprite(); // 75% здоровья
  const healthCtx = getCanvasCtx(healthSprite.material.map!)
  healthSprite.position.set(0, 310, 0);

  const manaSprite = createSprite();
  const manaCtx = getCanvasCtx(manaSprite.material.map!)
  manaSprite.position.set(0, 305, 0);

  target.add(healthSprite);
  target.add(manaSprite);

  const root = {
    update: ({ health, mana }) => {d
      updateTexture(healthCtx, health, '#ff0000');
      updateTexture(manaCtx, mana, '#3713dd');
    }
  }

  root.update({ health, mana });

  return root;
}