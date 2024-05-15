import * as THREE from 'three';
import { makeCtx } from '../../utils/makeCtx';

const createTexture = () => {
  const context = makeCtx(64, 16);
  const canvas = context.canvas 

  return new THREE.CanvasTexture(canvas);
}

const updateTexture = (texture: THREE.Texture, percent: number, color: string) => {
  const canvas = texture.source.data;
  const ctx = canvas.getContext('2d');

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

export const HealthBar = ({ health, mana }, target) =>  {
  const healthSprite = createSprite(); // 75% здоровья
  healthSprite.position.set(0, 310, 0);

  const manaSprite = createSprite();
  manaSprite.position.set(0, 305, 0);

  target.add(healthSprite);
  target.add(manaSprite);

  const root = {
    update: ({ health, mana }) => {
      updateTexture(healthSprite.material.map!, health, '#ff0000');
      updateTexture(manaSprite.material.map!, mana, '#3713dd');
    }
  }

  root.update({ health, mana });

  return root;
}