import * as THREE from 'three';

const createTexture = (percent, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const context = canvas.getContext('2d');


  // Полоса здоровья
  context.fillStyle = color;
  context.fillRect(2, 2, (canvas.width - 4) * (percent / 100), canvas.height - 4);

  return new THREE.CanvasTexture(canvas);
}

function createSprite(texture = createTexture(100, 'black')) {
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
      healthSprite.material.map = createTexture(health, '#ff0000');
      manaSprite.material.map = createTexture(mana, '#3713dd');
    }
  }

  root.update({ health, mana });

  return root;
}