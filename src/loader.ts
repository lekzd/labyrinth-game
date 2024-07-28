import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const textureLoader = new THREE.TextureLoader()
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

export enum texturesType {
  foliage_mask = 'foliage_mask.jpg',
  foliage = 'foliage.jpg',
  grass = 'grass.webp',
  runic_cube = 'runic_2.png',
  runic_normal_map = 'runic_normal_map.png',
  runic_metalness_map = 'runic_metalness_map.png',
  stone_wall_map = 'stone_wall_map.jpg',
  stone_wall_bump = 'stone_wall_bump.jpg',
  wood_gate_map = 'wood_gate_map.jpg',
  wood_gate_bump = 'wood_gate_bump.jpg',
  wood_gate_metalness_map = 'wood_gate_metalness_map.jpg',
  ground_forest_bump = 'ground_forest_bump.jpg',
  bark_base = 'Bark_06_basecolor.jpg',
  bark_normal = 'Bark_06_normal.jpg',
  hedge = 'Hedge_001_BaseColor.jpg',
}

export enum animationType {
  jumping = 'jumping',
  punch = 'punch',
  dagger_attack2 = 'dagger_attack2',
  staff_attack = 'staff_attack',
  sword_attackfast = 'sword_attackfast',
  hammer_attack = 'hammer_attack',
  // death = 'death',
  // run = 'run',
  // walk = 'walk',
}

export enum modelType {
  Monk = 'Monk',
  Cleric = 'Cleric',
  Rogue = 'Rogue',
  Warrior = 'Warrior',
  Wizard = 'Wizard',

  Skeleton_Mage = 'Skeleton_Mage',
  // Skeleton_Minion = 'Skeleton_Minion',
  // Skeleton_Rogue = 'Skeleton_Rogue',
  // Skeleton_Warrior = 'Skeleton_Warrior',
}

export enum weaponType {
  arrow = 'arrow',
  bow = 'bow',
  dagger = 'dagger',
  hammer = 'hammer',
  katana = 'katana',
  minigun = 'minigun',
  staff = 'staff',
  staff2 = 'staff2',
  sword = 'sword',
  swordLazer = 'swordLazer',
  crossbow = 'crossbow',
}

type ItemsType = {
  model: Partial<Record<modelType, THREE.Group<THREE.Object3DEventMap>>>
  weapon: Partial<Record<weaponType, THREE.Group<THREE.Object3DEventMap>>>
  weapon_glb: Partial<Record<weaponType, THREE.Group<THREE.Object3DEventMap>>>
  animation: Partial<Record<animationType, THREE.Group<THREE.Object3DEventMap>>>
  texture: Partial<Record<texturesType, THREE.Texture>>
}

export const loads: ItemsType = {
  weapon: {},
  weapon_glb: {},
  model: {},
  animation: {},
  texture: {},
}

type AbstractLoader = {
  load: (path: string, callback: (obj: any) => void) => void
}

const load = (
  loader: AbstractLoader,
  types: Record<string, string>,
  dir: keyof ItemsType = 'world',
  ext = ''
) => {
  let loaded = 0
  const entries = Object.entries(types)
  loads[dir] = {};

  return new Promise<void>(resolve => {
    entries.forEach(([, name], index) => {
      const path = `/${dir}/${name}${ext}`;

      loader.load(path, obj => {
        obj.name = name;
        if (obj.scene) {
          // @ts-expect-error
          loads[dir][name] = obj.scene;  
        } else {
          // @ts-expect-error
          loads[dir][name] = obj;
        }
        loaded++

        if (loaded === entries.length) {
          resolve()
        }
      });
    })
  })
}

export const loaders = [
  load(textureLoader, texturesType, 'texture'),
  load(fbxLoader, modelType, 'model', '.fbx'),
  load(fbxLoader, animationType, 'animation', '.fbx'),
  load(gltfLoader, weaponType, 'weapon_glb', '.glb'),
];

// @ts-expect-error
window.loads = loads