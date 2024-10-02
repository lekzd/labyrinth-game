import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Object3DEventMap,
  PointLight,
  Points,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3
} from "three";

import { frandom } from "@/utils/random";
import { assign } from "@/utils/assign";
import { DynamicObject } from "@/types";
import { state } from "@/state";
import { getDistance } from "@/utils/getDistance";
import { settings } from "../hero/settings";
import { throttle } from "@/utils/throttle.ts";
import { ParticlesMaterial } from "@/materials/particles";
import { loads } from "@/loader";
import { shadowSetter } from "@/utils/shadowSetter";
import { textureRepeat } from "@/utils/textureRepeat";
import { createMatrix } from "@/utils/createMatrix";
import { physicWorld } from "@/cannon";
import * as CANNON from "cannon";
import { GlowMaterial } from "@/materials/glow";
import { SpriteEffect } from "@/effects/SpriteEffect";

const healHealth = throttle((object: DynamicObject) => {
  state.setState({
    objects: {
      [object.id]: { health: (object.health || 0) + 1 }
    }
  });
}, 500);

const PARTICLE_COUNT = 75;
export class Campfire {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  private particleMaterial: ParticlesMaterial;
  private torch: PointLight;

  constructor(props: DynamicObject) {
    this.props = props;

    this.particleMaterial = new ParticlesMaterial({
      time: { value: 0.0 },
    });

    const { base, torch } = initMesh(props, this.particleMaterial);

    this.torch = torch;
    this.mesh = base;
  }

  onStateChange(prev: DynamicObject, next: DynamicObject) {
    if (!next) return;

    if (next.hasOwnProperty("state")) {
      this.torch.color = new Color(next.state ? 0x00ff33 : "rgb(230, 73, 33)");
      this.props.state = next.state;

      this.particleMaterial.color = new Color(
        next.state ? 0x00ff33 : "rgb(230, 73, 33)"
      );
      this.particleMaterial.map = next.state
        ? loads.texture["plus.png"]
        : loads.texture["dot.png"];
    }
  }

  update(timeDelta: number) {
    let healing = false;

    this.torch.position.x = Math.sin(performance.now() / 50) * 0.5;
    this.torch.intensity =
      3000 +
      Math.sin(performance.now() / 50) * 500 +
      Math.sin(performance.now() / 10) * 100;

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

      if (distance < 30 && (object.health || 0) < settings[object.type].health) {
        healHealth(object);
        healing = true;
      }
    });

    this.particleMaterial.uniforms.time.value += timeDelta * 2;

    if (this.props.state !== healing) {
      state.setState({
        objects: {
          [this.props.id]: { state: healing }
        }
      });
    }
  }
}

const ParticleSystem = (particleMaterial: ParticlesMaterial) => {
  // Создание массивов для хранения позиций частиц
  const positions = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу
  const indexes = new Float32Array(PARTICLE_COUNT * 3); // 3 компоненты (x, y, z) на каждую частицу

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = frandom(-2, 2); // Рандомное положение частицы по оси X
    positions[i + 1] = frandom(0, 10); // Рандомное положение частицы по оси Y
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

  particleSystem.position.y = 3;

  return particleSystem;
};

const Torch = () => {
  const torch = new PointLight(0xff4500, 2000, 70); // Цвет, интенсивность, дистанция факела
  torch.position.set(0, 5, 0); // Позиция факела (относительно руки персонажа)
  torch.shadow.mapSize.width = 100;
  torch.shadow.mapSize.height = 100;
  torch.shadow.camera.near = 0.5;
  torch.shadow.camera.far = 25;

  shadowSetter(torch, {
    castShadow: true
  });

  return torch;
};

const Shine = () => {
  const shine = new Sprite(
    new SpriteMaterial({
      map: loads.texture["dot.png"],
      color: new Color("rgb(200, 99, 31)"),
      opacity: 0.5
    })
  );

  shine.position.y = 7;
  shine.scale.set(30, 30, 20);

  return shine;
};

const Altar = () => {
  const altar = new Mesh(
    new CylinderGeometry(30, 30, 1, 6, 1), // Геометрия сферы
    new MeshStandardMaterial({
      color: new Color("rgb(24, 24, 24)"),
      map: textureRepeat(loads.texture["stone_wall_map.jpg"]!, 1, 1, 3, 3),
      normalMap: textureRepeat(
        loads.texture["stone_wall_bump.jpg"]!,
        1,
        1,
        3,
        3
      ),
      normalScale: new Vector2(2, 2),
      metalness: 0,
      roughness: 0.6
    })
  );

  shadowSetter(altar, {
    receiveShadow: true
  });

  const base = new Mesh(
    new CylinderGeometry(5, 5, 3, 6, 1),
    new MeshStandardMaterial({
      color: new Color("rgb(24, 24, 24)"),
      metalness: 0,
      roughness: 0.6
    })
  );

  shadowSetter(base, {
    castShadow: true
  });

  const count = 24;
  const radius = 100;
  const geometry = new CylinderGeometry(5, 5, 30, 4, 1);
  const stoneShape = new CANNON.Box(new CANNON.Vec3(5, 30, 5));
  const material = new MeshStandardMaterial({
    color: new Color("rgb(132, 124, 84)"),
    metalness: 0,
    roughness: 0.8,
    map: textureRepeat(loads.texture["stone_wall_map.jpg"]!, 1, 1, 0.3, 0.3),
    aoMap: textureRepeat(loads.texture["stone_wall_ao.jpg"]!, 1, 1, 0.3, 0.3),
    normalMap: textureRepeat(
      loads.texture["stone_wall_bump.jpg"]!,
      1,
      1,
      0.3,
      0.3
    ),
    normalScale: new Vector2(5, 5),
  });

  const instanceNumber = count * 2;

  const instancedMesh = new InstancedMesh(
    geometry,
    material,
    instanceNumber
  );

  const boxBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const matrix = createMatrix({
      translation: {
        x, y: 15, z,
      },
      rotation: {
        y: -angle - (Math.PI / 2) * (i % 4),
      }
    });

    boxBody.addShape(
      stoneShape,
      new CANNON.Vec3(x, 0, z)
    );

    instancedMesh.setMatrixAt(i, matrix);
  }

  physicWorld.addBody(boxBody);

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const matrix = createMatrix({
      translation: {
        x, y: 30, z,
      },
      rotation: {
        y: -angle - Math.PI / 2,
        z: Math.PI / 2,
      }
    })

    instancedMesh.setMatrixAt(count + i, matrix);
  }

  altar.add(instancedMesh);
  altar.add(base);

  return altar;
};

const Ring = () => {
  const count = 24;
  const radius = 15;
  const geometry = new BoxGeometry(3.5, 3.5, 3.5);
  // const material = new MeshStandardMaterial({
  //   color: new Color("rgb(69, 69, 69)"),
  //   metalness: 0,
  //   roughness: 0.8,
  //   map: textureRepeat(loads.texture["stone_wall_map.jpg"]!, 1, 1, 0.3, 0.3),
  //   normalMap: textureRepeat(
  //     loads.texture["stone_wall_bump.jpg"]!,
  //     1,
  //     1,
  //     0.3,
  //     0.3
  //   ),
  //   normalScale: new Vector2(1, 1),
  // });

  const material = new MeshBasicMaterial({
    color: new Color("rgb(36, 198, 168)"),
    wireframe: true,
    side: 2,
  });

  const instanceNumber = count * 2;

  const instancedMesh = new InstancedMesh(
    geometry,
    material,
    instanceNumber
  );

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const matrix = createMatrix({
      translation: {
        x, y: y + radius, z: 0,
      },
      rotation: {
        z: angle + (Math.PI / 2),
      },
      scale: {
        x: 1, 
        y: frandom(0.5, 1.5),
        z: frandom(0.5, 1.5),
      }
    });

    instancedMesh.setMatrixAt(i, matrix);
  }

  const effect = SpriteEffect({
    texture: loads.texture["fx_portal.png"],
    position: new Vector3(0, radius, 0),
    size: new Vector2(5, 6),
    scale: 30,
    rotation: 0,
  });

  setInterval(() => {
    effect.update(Math.floor((0.5 + (Math.sin(performance.now() / 200) * .5)) * 28));
  }, 40);

  instancedMesh.rotateY(Math.PI / 2);

  return instancedMesh
}

function initMesh(props: DynamicObject, particleMaterial: ParticlesMaterial) {
  const base = new Object3D();
  const sphere = new Mesh(
    new SphereGeometry(1, 32, 32), // Геометрия сферы
    new MeshBasicMaterial({ color: 0xff4500 })
  );

  const particleSystem = ParticleSystem(particleMaterial);
  const torch = Torch();
  const shine = Shine();

  // Добавление эффекта частиц к костру
  base.add(sphere);
  base.add(particleSystem);
  base.add(torch);
  base.add(shine);
  base.add(Altar());
  base.add(Ring());

  base.updateMatrixWorld(true);
  base.matrixAutoUpdate = false;

  assign(base.position, props.position);
  return { base, torch };
}
