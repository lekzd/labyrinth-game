import {
  Group,
  Material,
  Mesh,
  Object3D,
  Object3DEventMap,
  Quaternion,
  Vector3,
  Vector3Like,
  Color
} from "three";
import { pickBy } from "@/utils/pickBy.ts";
import { loads, weaponType } from "@/loader";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Box } from "@/uses";
import { NpcBaseAnimations } from "./NpcAnimationStates.ts";
import { HealthBar } from "./healthbar.ts";
import { HeroProps } from "@/types";
import { DissolveEffect } from "@/effects/DissolveEffect";
import { StateEntity } from "@/entities/StateEntity";
import { HeroPhysicEntity } from "@/entities/HeroPhysicEntity";
import { AnimationEntity } from "@/entities/AnimationEntity.ts";
import { state } from "@/state.ts";
import { castShadows } from "@/utils/castShadows";

// Скорость догоняния сетевого поворота, 1/сек (не зависит от FPS)
const FOLLOW_RATE = 4;
// Как часто приходят сетевые позиции (тик спавнера и троттлинг контроллера), сек
const NETWORK_INTERVAL = 0.5;
// Дальше этого — телепорт, а не догоняние
const SNAP_DISTANCE = 100;

export class Hero {
  private target: Object3D<Object3DEventMap>;
  private healthBar;
  private clothMaterials: Material[];
  private dead = false;
  // Позиция из сети и скорость, с которой к ней идём
  private networkTarget = new Vector3();
  private chaseSpeed = 0;
  // Управляется этим клиентом: позицию задаёт контроллер, сетевое догоняние не нужно
  isLocal = false;
  public weaponObject: Object3D<Object3DEventMap>;

  readonly decceleration = new Vector3(-0.0005, -0.0001, -5.0);
  readonly acceleration = new Vector3(1, 0.25, 50.0);
  readonly velocity = new Vector3(0, 0, 0);
  readonly props: HeroProps;
  readonly state: StateEntity;
  physicEntity: HeroPhysicEntity;
  animationEntity: AnimationEntity;

  constructor(props: HeroProps) {
    const model = loads.model[props.type];

    if (!model) {
      throw Error(`No model with type "${props.type}"`);
    }

    this.state = new StateEntity(
      pickBy(props, [
        "id",
        "health",
        "mana",
        "speed",
        "mass",
        "attack",
        "position",
        "rotation"
      ]),
      { networked: true, killOnZeroHealth: false }
    );

    this.props = props;
    const { wrapper, target } = initTarget(model, props);
    this.target = wrapper;
    this.clothMaterials = attachClothWind(target);

    this.animationEntity = new AnimationEntity({ target });

    this.physicEntity = new HeroPhysicEntity({
      target: this.target,
      physicY: 8,
      physicRadius: 5,
      mass: 5
    });

    this.healthBar = HealthBar(this.state.props, this.target);

    this.initWeapon(this.props.weapon);
  }

  get id() {
    return this.props.id;
  }

  get mesh() {
    return this.target;
  }

  get position() {
    return this.target.position;
  }

  get quaternion() {
    return this.target?.quaternion;
  }
  get rotation() {
    return this.target?.quaternion;
  }

  get isDead() {
    return this.dead;
  }

  private initWeapon(weaponType?: weaponType) {
    // weapon.R — сокет в ладони Journey (weapon_socket.py): ось Y сокета — направление оружия.
    // У старых моделей только кисть, там подогнанный поворот
    const slot = this.target.getObjectByName("weaponR");
    const weaponRightHand = slot ?? this.target.getObjectByName("handR");

    if (!weaponRightHand) {
      return;
    }

    weaponRightHand.remove(...weaponRightHand.children);

    if (!weaponType) {
      return;
    }

    if (loads.weapon_glb[weaponType]) {
      this.weaponObject = clone(loads.weapon_glb[weaponType]!);
    } else {
      const boxMesh = new Box({
        id: "asdasd",
        type: "Box",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 0 }
      }).mesh;
      const group = new Group();
      group.add(boxMesh);

      boxMesh.scale.set(0.1, 0.1, 0.1);

      this.weaponObject = group;
    }

    if (slot) {
      this.weaponObject.scale.setScalar(0.3);
      // длинная ось моделей оружия — X: поворот ставит её вдоль сокета, оружие вертикально
      this.weaponObject.rotation.set(0, Math.PI / 2, Math.PI / 2);
    } else {
      this.weaponObject.scale.set(0.5, 0.5, 0.5);
      this.weaponObject.rotation.set(0, Math.PI * 0.3, Math.PI * 0.1);
    }

    weaponRightHand.add(this.weaponObject);
  }

  setPosition(position: Partial<Vector3Like>, lerpFactor = 1) {
    if (!position || !this.physicEntity.body.position) return;

    this.physicEntity.setPositionLerp(position, lerpFactor);
  }

  onStateChange(_prev: unknown, next: Partial<HeroProps> | null) {
    if (!next || this.dead) return;

    if (next.weapon) {
      this.props.weapon = next.weapon;
      this.initWeapon(next.weapon);
    }

    if (next.baseAnimation) {
      this.props.baseAnimation = next.baseAnimation;
      this.animationEntity.setBaseAnimation(next.baseAnimation);
    }

    if (next.hasOwnProperty("additionsAnimation")) {
      this.props.additionsAnimation = next.additionsAnimation;
      this.animationEntity.setAdditionsAnimation(next.additionsAnimation);
    }

    if (next.health !== undefined) {
      const hurt = this.props.health !== undefined && next.health < this.props.health && next.health > 0;
      this.props.health = next.health;
      if (hurt) this.flinch();
      // Слушатель StateEntity срабатывает позже этого колбэка, поэтому берём свежее значение из next
      this.healthBar.update({ ...this.state.props, health: next.health });

      if (next.health <= 0) {
        this.die();
      }
    }
  }

  // Вздрагивание при уроне — поверх текущей анимации, верхняя часть тела
  private flinchTimer?: ReturnType<typeof setTimeout>;

  private flinch() {
    if (this.flinchTimer || this.props.additionsAnimation) return;

    this.animationEntity.setAdditionsAnimation(NpcBaseAnimations.receivehit);
    this.flinchTimer = setTimeout(() => {
      this.flinchTimer = undefined;
      if (!this.dead) this.animationEntity.setAdditionsAnimation(this.props.additionsAnimation ?? null);
    }, this.animationEntity.getDuration(NpcBaseAnimations.receivehit) * 1000);
  }

  // Действие с предметом (pickup — поднять, interact — толкнуть/повернуть), только свой герой.
  // Анимация идёт через стейт, чтобы её видели остальные игроки
  private actionTimer?: ReturnType<typeof setTimeout>;

  playAction(name: string) {
    if (this.actionTimer || this.dead) return;

    state.setState({ objects: { [this.id]: { baseAnimation: name } } });
    this.actionTimer = setTimeout(() => {
      this.actionTimer = undefined;
      if (!this.dead) state.setState({ objects: { [this.id]: { baseAnimation: NpcBaseAnimations.idle } } });
    }, this.animationEntity.getDuration(name) * 1000);
  }

  setRotation(angle: number) {
    const controlObject = this.target;
    const quaternion = new Quaternion();
    const axis = new Vector3(0, 1, 0);
    const npcRotation = controlObject.quaternion.clone();

    quaternion.setFromAxisAngle(axis, angle);
    npcRotation.multiply(quaternion);

    controlObject.quaternion.copy(npcRotation);

    this.physicEntity.body.quaternion.set(
      npcRotation.x,
      npcRotation.y,
      npcRotation.z,
      npcRotation.w
    );
  }

  // Единственная точка смерти: доиграть анимацию, растворить и только потом удалить из стейта
  die() {
    if (this.dead) return;

    this.dead = true;

    this.animationEntity.setAdditionsAnimation(null);
    this.animationEntity.setBaseAnimation(NpcBaseAnimations.death);

    const delay = this.animationEntity.getDuration(NpcBaseAnimations.death) * 1000;

    setTimeout(() => {
      new DissolveEffect().run(this.target, new Color("#FAEB9C"), 3);
      this.state.makeKill();
    }, delay);
  }

  hit(by: HeroProps, _point: Vector3) {
    if (this.dead) return;

    const { attack = 0 } = by;

    // Смерть наступит через onStateChange, когда health дойдёт до нуля
    this.state.makeHit(attack);
  }

  update(timeInSeconds: number) {
    this.animationEntity.update(timeInSeconds);
    windTime.value = performance.now() / 1000;
    updateClothWind(this.clothMaterials);

    const { body } = this.physicEntity;

    // Персонажем двигает контроллер или сеть, а физика только выталкивает из препятствий.
    // Накопленная горизонтальная скорость иначе уносит тело на 0–2 шага физики за кадр — модель трясёт
    body.velocity.x = 0;
    body.velocity.z = 0;

    const obj = state.objects[this.id];

    if (this.isLocal || this.dead || !obj || !obj.position) return;

    this.followNetwork(obj.position, timeInSeconds);

    if (obj.rotation) {
      const q2 = new Quaternion().copy(obj.rotation);
      const q1 = new Quaternion()
        .copy(body.quaternion)
        .slerp(q2, 1 - Math.exp(-FOLLOW_RATE * timeInSeconds));

      body.quaternion.set(q1.x, q1.y, q1.z, q1.w);
    }

    this.target.updateMatrixWorld(true);
  }

  // Сетевые позиции приходят рывками раз в NETWORK_INTERVAL: идём к каждой с постоянной скоростью,
  // чтобы моб шёл ровно, а не дёргался «рывок — торможение» на каждом тике
  private followNetwork(position: Vector3Like, timeInSeconds: number) {
    const { body } = this.physicEntity;
    const current = new Vector3(body.position.x, body.position.y - this.physicEntity.physicY, body.position.z);
    const distance = current.distanceTo(position);

    if (!this.networkTarget.equals(position as Vector3)) {
      this.networkTarget.copy(position as Vector3);
      this.chaseSpeed = distance / NETWORK_INTERVAL;
    }

    if (distance < 1e-3) return;

    const step = distance > SNAP_DISTANCE ? 1 : Math.min(1, (this.chaseSpeed * timeInSeconds) / distance);

    this.physicEntity.setPositionLerp(position, step);
  }

  dispose() {
    this.state.dispose();
    this.healthBar.dispose();
    this.animationEntity.mixer.stopAllAction();

    for (const material of this.clothMaterials) material.dispose();
  }
}

function initTarget(model: Group<Object3DEventMap>, props: HeroProps) {
  const target = castShadows(clone(model));

  // Враппер нужно чтобы анимациия не привязывались к основному слою, а к модельке (иначе проебывается позиционирование)
  const wrapper = new Group();
  wrapper.name = `${model.name}_wrapper`;
  wrapper.userData.id = props.id;

  wrapper.add(target);

  Object.assign(wrapper.position, props.position);
  Object.assign(wrapper.quaternion, props.rotation);

  wrapper.scale.multiplyScalar(5);

  wrapper.updateMatrix();

  return { wrapper, target };
}

// Общий uniform времени для всех плащей: шейдерная программа одна, клонов материалов много
const windTime = { value: 0 };

// Ветер в мире: направление и сила. Смещение в единицах модели (рост персонажа ~2.2),
// добавляется поверх запечённой ткани и скиннинга — качание при ходьбе сохраняется
const WIND_DIRECTION = new Vector3(1, 0, 0.35).normalize();
const WIND_STRENGTH = 0.06;
const WIND_FLUTTER = 0.012;

// Меши ткани (имена узлов в модели) и доля их высоты сверху, которая закреплена и не качается:
// у капюшона — голова и плечи, у юбки — пояс
const CLOTH_MESH: [RegExp, number][] = [
  [/капюшон/i, 0.55],
  [/плащ/i, 0.3],
];

type ClothWind = { mesh: Mesh; wind: { value: Vector3 } };

// Материал у модели один на все меши, поэтому каждой ткани выдаём собственную копию
export function attachClothWind(target: Object3D) {
  const materials: Material[] = [];

  target.traverse((obj) => {
    const mesh = obj as Mesh;

    if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return;

    const pinned = CLOTH_MESH.find(([re]) => re.test(mesh.name))?.[1];

    if (pinned === undefined) return;

    // Границы в покое (локальные координаты меша, Y вверх): ниже top ткань свободна
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const top = box.max.y - (box.max.y - box.min.y) * pinned;
    const wind = { value: new Vector3() };

    const material = mesh.material.clone();
    material.userData.wind = { mesh, wind } satisfies ClothWind;

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windTime;
      shader.uniforms.uWind = wind;
      shader.uniforms.uWindTop = { value: top };
      shader.uniforms.uWindBottom = { value: box.min.y };
      shader.uniforms.uFlutter = { value: WIND_FLUTTER };

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `
          #include <common>
          uniform float uTime;
          uniform vec3 uWind;
          uniform float uWindTop;
          uniform float uWindBottom;
          uniform float uFlutter;
          `
        )
        .replace(
          "#include <skinning_vertex>",
          `
          #include <skinning_vertex>

          // 0 у закреплённого верха, 1 у подола; фазы — по позе покоя, чтобы волна не прыгала
          float windWeight = 1.0 - smoothstep(uWindBottom, uWindTop, position.y);
          windWeight *= windWeight;
          float gust = 0.65 + 0.35 * sin(uTime * 0.9 + position.x * 1.7) * sin(uTime * 0.37 + 1.3);
          float flutter = sin(uTime * 3.1 + position.y * 11.0 + position.x * 7.0 + position.z * 5.0);
          transformed += (uWind * gust + objectNormal * flutter * uFlutter) * windWeight;
          `
        );
    };

    mesh.material = material;
    materials.push(material);
  });

  return materials;
}

const inverseRotation = new Quaternion();

// Ветер дует в мире в одну сторону: переводим направление в локальные координаты каждой ткани
export function updateClothWind(materials: Material[]) {
  for (const material of materials) {
    const { mesh, wind } = material.userData.wind as ClothWind;

    mesh.getWorldQuaternion(inverseRotation).invert();
    wind.value.copy(WIND_DIRECTION).applyQuaternion(inverseRotation).multiplyScalar(WIND_STRENGTH);
  }
}
