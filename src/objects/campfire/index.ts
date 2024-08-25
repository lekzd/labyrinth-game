import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Object3DEventMap,
  PointLight,
  Points,
  ShaderMaterial,
  SphereGeometry
} from "three";

import { frandom } from "@/utils/random";
import vertexShader from "./shader.vert";
import fragmentShader from "./shader.frag";
import { assign } from "@/utils/assign";
import { DynamicObject } from "@/types";
import { state } from "@/state";
import { getDistance } from "@/utils/getDistance";
import { settings } from "../hero/settings";
import { throttle } from "@/utils/throttle.ts";

const healHealth = throttle((object: DynamicObject) => {
  state.setState({
    objects: {
      [object.id]: { health: object.health + 1 }
    }
  });
}, 500);

const PARTICLE_COUNT = 100;
export class Campfire {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  private particleMaterial: ShaderMaterial;
  private torch: PointLight;

  constructor(props: DynamicObject) {
    this.healing = false;
    this.props = props;
    this.particleMaterial = new ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        size: { value: 0.1 },
        healing: { value: 0.0 }
      },
      vertexShader,
      fragmentShader
    });

    const { base, torch } = initMesh(props, this.particleMaterial);

    this.torch = torch;
    this.mesh = base;
  }

  onStateChange(prev, next) {
    if (!next) return;

    if (next.hasOwnProperty('state')) {
      this.torch.color = new Color(next.state ? 0x00ff33 : 0xff4500);
      this.props.state = next.state;

      this.particleMaterial.uniforms.healing.value = +next.state;
      this.particleMaterial.uniformsNeedUpdate = true;
    }
  }

  update(timeDelta: number) {
    let healing = false;

    Object.entries(state.objects).forEach(([id, object]) => {
      if (id === this.props.id) {
        return;
      }

      if (
        !["Monk", "Cleric", "Rogue", "Warrior", "Wizard"].includes(object?.type)
      ) {
        return;
      }

      const distance = getDistance(this.props.position, object.position);

      if (distance < 30 && object.health < settings[object.type].health) {
        healHealth(object);
        healing = true;
      }
    });

    this.particleMaterial.uniforms.time.value += timeDelta * 2;
    this.particleMaterial.uniformsNeedUpdate = true;

    if (this.props.state !== healing) {
      state.setState({
        objects: {
          [this.props.id]: { state: healing }
        }
      });
    }
  }
}

function initMesh(props: DynamicObject, particleMaterial: ShaderMaterial) {
  const base = new Object3D();
  const sphere = new Mesh(
    new SphereGeometry(1, 32, 32), // Геометрия сферы
    new MeshBasicMaterial({ color: 0xff4500 })
  );
  // Создание массивов для хранения позиций частиц
  const positions = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
  const indexes = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = frandom(-2, 2); // Рандомное положение частицы по оси X
    positions[i + 1] = frandom(0, 2); // Рандомное положение частицы по оси Y
    positions[i + 2] = frandom(-2, 2); // Рандомное положение частицы по оси Z

    indexes[i] = i / positions.length;
    indexes[i + 1] = frandom(0.1, 1);
    indexes[i + 2] = frandom(0.1, 1);
  }
  // Создание буферной геометрии для частиц
  const particleGeometry = new BufferGeometry();
  particleGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  particleGeometry.setAttribute("values", new BufferAttribute(indexes, 3));

  const particleSystem = new Points(particleGeometry, particleMaterial);
  // Добавление эффекта частиц к костру
  base.add(sphere);
  base.add(particleSystem);
  const torch = new PointLight(0xff4500, 400, 1000); // Цвет, интенсивность, дистанция факела
  torch.position.set(0, 5, 0); // Позиция факела (относительно руки персонажа)
  torch.castShadow = true;
  torch.shadow.mapSize.width = 100;
  torch.shadow.mapSize.height = 100;
  torch.shadow.camera.near = 0.5;
  torch.shadow.camera.far = 25;
  torch.shadow.camera.left = -10;
  torch.shadow.camera.right = 10;
  torch.shadow.camera.top = 10;
  torch.shadow.camera.bottom = -10;
  torch.shadow.radius = 5;
  torch.shadow.blurSamples = 5;

  base.add(torch);

  assign(base.position, props.position);
  return { base, torch };
}
