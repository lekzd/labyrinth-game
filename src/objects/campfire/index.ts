import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
  PointLight,
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
import { CampfireMaterial } from "@/materials/campfire";
import { FlameMaterial } from "@/materials/flame";
import { EmbersMaterial } from "@/materials/embers";
import { loads, weaponType } from "@/loader";
import { shadowSetter } from "@/utils/shadowSetter";
import { textureRepeat } from "@/utils/textureRepeat";
import { createMatrix } from "@/utils/createMatrix";
import { physicWorld } from "@/cannon";
import * as CANNON from "cannon";
import { SpriteEffect } from "@/effects/SpriteEffect";
import { StoneMatetial } from "@/materials/stone";
import { ParticleSystem } from "../common/ParticleSystem";
import { Shine } from "../common/Shine";
import { selectAllPlayerObjects } from "@/utils/stateUtils";
import { virtualLight } from "@/systems/virtualLights";

const healHealth = throttle((object: DynamicObject) => {
  state.setState({
    objects: {
      [object.id]: { health: (object.health || 0) + 1 }
    }
  });
}, 500);

const getRingMatrices = () => {
  const count = 24;
  const radius = 15;
  const result: Matrix4[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    result.push(createMatrix({
      translation: {
        x,
        y: y + radius,
        z: 0
      },
      rotation: {
        z: angle + Math.PI / 2
      },
      scale: {
        x: 1,
        y: frandom(0.5, 1.5),
        z: frandom(0.5, 1.5)
      }
    }));
  }

  return result;
};

export class Campfire {
  readonly props: DynamicObject;
  readonly mesh: Object3D<Object3DEventMap>;
  private particleMaterial: CampfireMaterial;
  private flameMaterials: FlameMaterial[];
  private embersMaterials: EmbersMaterial[];
  private torch: PointLight;
  private parts: any;
  private ringMatrices: Matrix4[];

  constructor(props: DynamicObject) {
    this.props = props;

    this.particleMaterial = new CampfireMaterial({
      time: { value: 0.0 }
    });

    const { base, torch, parts, ringMatrices, flameMaterials, embersMaterials } =
      initMesh(props, this.particleMaterial);

    this.torch = torch;
    this.flameMaterials = flameMaterials;
    this.embersMaterials = embersMaterials;
    this.mesh = base;
    this.parts = parts;
    this.ringMatrices = ringMatrices;
  }

  onStateChange(prev: DynamicObject, next: DynamicObject) {
    if (!next) return;

    if (next.hasOwnProperty("state")) {
      this.torch.color = new Color(
        next.state.healing ? 0x00ff33 : "rgb(230, 73, 33)"
      );
      this.props.state = next.state;

      this.particleMaterial.setHealing(next.state.healing);
      this.flameMaterials.forEach((material) => material.setHealing(next.state.healing));
      this.embersMaterials.forEach((material) => material.setHealing(next.state.healing));

      if (next.state.parts) {
        this.mesh.remove(this.parts.mesh);

        const parts = Parts(next, this.ringMatrices);

        this.mesh.add(parts.mesh);
      }
    }
  }

  update(timeDelta: number) {
    let healing = false;

    const now = performance.now();

    // Несколько синусов с несоизмеримыми частотами дают неповторяющееся мерцание.
    // Позицию лампы не трогаем: от низкого источника даже сдвиг на полметра гоняет тени по всей поляне
    this.torch.intensity =
      3000 +
      Math.sin(now / 97) * 300 +
      Math.sin(now / 41) * 250 +
      Math.sin(now / 23) * 120;

    state.select(selectAllPlayerObjects).forEach((object) => {
      if (object.id === this.props.id) {
        return;
      }

      const distance = getDistance(this.props.position, object.position);

      if (distance < 30) {
        if ((object.health || 0) < settings[object.type].health) {
          healHealth(object);
          healing = true;
        }

        if (object.weapon === "AltarPart") {
          state.setState({
            objects: {
              [object.id]: { weapon: weaponType.arrow },
              [this.props.id]: {
                state: {
                  ...this.props.state,
                  parts: (this.props.state.parts || 0) + 1
                }
              }
            }
          });
        }
      }
    });

    this.particleMaterial.uniforms.time.value += timeDelta * 2;
    this.flameMaterials.forEach((material) => {
      material.uniforms.time.value += timeDelta;
    });
    this.embersMaterials.forEach((material) => {
      material.uniforms.time.value += timeDelta;
    });

    if (this.props.state.healing !== healing) {
      state.setState({
        objects: {
          [this.props.id]: { state: { ...this.props.state, healing } }
        }
      });
    }
  }
}

const Torch = () => {
  const torch = new PointLight(0xff4500, 2000, 70); // Цвет, интенсивность, дистанция факела
  torch.position.set(0, 8, 0); // Над пламенем, чтобы тени от травы не растягивались по земле
  torch.shadow.mapSize.width = 100;
  torch.shadow.mapSize.height = 100;
  torch.shadow.camera.near = 0.5;
  torch.shadow.camera.far = 25;

  shadowSetter(torch, {
    castShadow: true
  });

  return virtualLight(torch);
};

const Altar = (props: DynamicObject) => {
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

  const count = 24;
  const radius = 100;
  const geometry = new CylinderGeometry(5, 5, 30, 4, 1);
  const stoneShape = new CANNON.Box(new CANNON.Vec3(5, 30, 5));

  const material = new StoneMatetial({
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
    normalScale: new Vector2(5, 5)
  });

  const instanceNumber = count * 2;

  const instancedMesh = new InstancedMesh(geometry, material, instanceNumber);

  const boxBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });

  boxBody.position.set(props.position.x, 0, props.position.z);

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const matrix = createMatrix({
      translation: {
        x,
        y: 15,
        z
      },
      rotation: {
        y: -angle - (Math.PI / 2) * (i % 4)
      }
    });

    boxBody.addShape(stoneShape, new CANNON.Vec3(x, 0, z));

    instancedMesh.setMatrixAt(i, matrix);
  }

  physicWorld.addBody(boxBody);

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const matrix = createMatrix({
      translation: {
        x,
        y: 30,
        z
      },
      rotation: {
        y: -angle - Math.PI / 2,
        z: Math.PI / 2
      }
    });

    instancedMesh.setMatrixAt(count + i, matrix);
  }

  altar.add(instancedMesh);

  return altar;
};

const Ring = (props: DynamicObject, ringMatrices: Matrix4[]) => {
  const radius = 15;
  const geometry = new BoxGeometry(3.5, 3.5, 3.5);

  const material = new MeshBasicMaterial({
    color: new Color("rgb(36, 198, 168)"),
    wireframe: true,
    side: 2
  });

  const instanceNumber = ringMatrices.length * 2;

  const instancedMesh = new InstancedMesh(geometry, material, instanceNumber);

  ringMatrices.forEach((matrix, index) => {
    instancedMesh.setMatrixAt(index, matrix);
  });

  const effect = SpriteEffect({
    texture: loads.texture["fx_portal.png"]!,
    position: new Vector3(props.position.x, radius, props.position.z),
    size: new Vector2(5, 6),
    scale: 30,
    rotation: 0
  });

  setInterval(() => {
    effect.update(
      Math.floor((0.5 + Math.sin(performance.now() / 200) * 0.5) * 28)
    );
  }, 40);

  // instancedMesh.rotateY(Math.PI / 2);

  return instancedMesh;
};

// Верх каменной площадки алтаря, на которой лежит костёр
const HEARTH_TOP = 0.5;

const Flames = () => {
  const group = new Object3D();
  const materials: FlameMaterial[] = [];

  const flames = [
    { width: 7, height: 12, seed: 0, intensity: 0.8, x: 0, z: 0 },
    { width: 4.5, height: 8, seed: 3.7, intensity: 0.6, x: 1.2, z: 0.6 },
    { width: 4.5, height: 7, seed: 7.3, intensity: 0.6, x: -1.0, z: -0.8 }
  ];

  flames.forEach(({ width, height, seed, intensity, x, z }) => {
    const geometry = new PlaneGeometry(width, height);
    geometry.translate(0, height / 2, 0);

    const material = new FlameMaterial({ seed, intensity });
    const flame = new Mesh(geometry, material);

    flame.position.set(x, HEARTH_TOP + 0.2, z);
    flame.renderOrder = 1;

    materials.push(material);
    group.add(flame);
  });

  return { mesh: group, materials };
};

const Logs = (props: DynamicObject) => {
  const group = new Object3D();
  const center = new Vector3(props.position.x, HEARTH_TOP, props.position.z);
  const map = textureRepeat(loads.texture["Bark_06_basecolor.jpg"]!, 1, 1, 1, 1)!;

  const logsMaterial = new EmbersMaterial({ map, center, radius: 5.5, glow: 1 });
  const bedMaterial = new EmbersMaterial({ map, center, radius: 3.5, glow: 1.4 });

  const bed = new Mesh(new CylinderGeometry(2.4, 2.8, 0.6, 12), bedMaterial);
  bed.position.y = HEARTH_TOP + 0.3;
  group.add(bed);

  const count = 5;
  const length = 5.5;
  const tilt = 0.2;
  const logGeometry = new CylinderGeometry(0.55, 0.65, length, 8);

  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count + frandom(-0.2, 0.2);
    const pivot = new Object3D();
    const log = new Mesh(logGeometry, logsMaterial);

    // Полено лежит радиально, внутренний конец приподнят над углями
    log.rotation.z = -Math.PI / 2 - tilt;
    log.position.set(length / 2 - 0.1, HEARTH_TOP + 0.65, 0);

    pivot.rotation.y = angle;
    pivot.add(log);
    group.add(pivot);
  }

  return { mesh: group, materials: [logsMaterial, bedMaterial] };
};

const Parts = (props: DynamicObject, ringMatrices: Matrix4[]) => {
  const parts = props.state.parts || 0;
  const geometry = new BoxGeometry(3.5, 3.5, 3.5);

  const material = new MeshStandardMaterial({
    color: new Color("rgb(83, 83, 83)")
  });

  const instanceNumber = ringMatrices.length * 2;

  const instancedMesh = new InstancedMesh(geometry, material, instanceNumber);

  ringMatrices.slice(0, parts).forEach((matrix, index) => {
    instancedMesh.setMatrixAt(index, matrix);
  });

  instancedMesh.rotateY(Math.PI / 2);

  return {
    mesh: instancedMesh,
    count: parts
  };
};

function initMesh(props: DynamicObject, particleMaterial: CampfireMaterial) {
  const base = new Object3D();
  const ringMatrices = getRingMatrices();

  const particleSystem = ParticleSystem({
    count: 60,
    material: particleMaterial,
    x: [-1.5, 1.5],
    y: [0, 0],
    z: [-1.5, 1.5],
    size: [0.3, 1.0],
    speed: [0, 1]
  });

  particleSystem.position.y = HEARTH_TOP + 0.5;

  const flames = Flames();
  const logs = Logs(props);

  const torch = Torch();

  const shine = Shine({ color: new Color("rgb(200, 99, 31)") });
  shine.position.y = 7;
  shine.scale.set(30, 30, 20);

  const parts = Parts(props, ringMatrices);

  base.add(logs.mesh);
  base.add(flames.mesh);
  base.add(particleSystem);
  base.add(torch);
  base.add(shine);
  base.add(Altar(props));
  // base.add(Ring(props, ringMatrices));
  base.add(parts.mesh);

  assign(base.position, props.position);

  base.updateMatrixWorld(true);
  base.matrixAutoUpdate = false;

  return {
    base,
    torch,
    parts,
    ringMatrices,
    flameMaterials: flames.materials,
    embersMaterials: logs.materials
  };
}
