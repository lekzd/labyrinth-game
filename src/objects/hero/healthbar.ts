import * as THREE from 'three';
import { makeCtx } from '@/utils/makeCtx';
import {isEqual} from "@/utils/isEqual.ts";
import {settings} from "./settings.ts";
import { HeroProps } from '@/types';

const createTexture = () => {
  const context = makeCtx(64, 16);

  return new THREE.CanvasTexture(context.canvas);
}

const updateTexture = (texture: THREE.Texture, percent: number, color: string) => {
  const ctx = getCanvasCtx(texture.material.map!)
  const canvas = ctx.canvas

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = color;
  ctx.fillRect(2, 2, (canvas.width - 4) * (percent / 100), canvas.height - 4);

  texture.material.map = new THREE.CanvasTexture(canvas)
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

export const HealthBar = (props: HeroProps, target) =>  {
  let state = {}
  const base = settings[props.type];
  const healthSprite = createSprite(); // 75% здоровья
  healthSprite.position.set(0, 310, 0);

  const manaSprite = createSprite();
  manaSprite.position.set(0, 305, 0);

  target.add(healthSprite);
  target.add(manaSprite);

  const root = {
    update: ({ health, mana }: HeroProps) => {
      if (isEqual(state, { health, mana })) return;

      updateTexture(healthSprite, health / base.health * 100, '#ff0000');
      updateTexture(manaSprite, mana / base.mana * 100, '#3713dd');

      state = { health, mana }
    }
  }

  root.update(props);

  return root;
}