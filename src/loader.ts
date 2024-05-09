import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const textureLoader = new THREE.TextureLoader()
const loader = new FBXLoader();

export enum texturesType {
  stone_wall = 'stone_wall.jpg',
  wood_floor = 'wood_floor.jpg',
  tree = 'Tree.png',
}

export enum animationType {
  jumping = 'jumping',
}

export enum modelType {
  Monk = 'Monk',
  Cleric = 'Cleric',
  Rogue = 'Rogue',
  Warrior = 'Warrior',
  Wizard = 'Wizard',
}

export enum worldType {
  Tree_001 = 'Tree_001',
  Tree_002 = 'Tree_002',
  Tree_003 = 'Tree_003',
  Tree_004 = 'Tree_004',
  Tree_005 = 'Tree_005',
  Tree_006 = 'Tree_006',
  Tree_007 = 'Tree_007',
  Tree_008 = 'Tree_008',
  Tree_009 = 'Tree_009',
  Tree_010 = 'Tree_010',
  Tree_011 = 'Tree_011',
  Tree_012 = 'Tree_012',
  Tree_013 = 'Tree_013',
  Tree_014 = 'Tree_014',
  Tree_015 = 'Tree_015',
  Tree_016 = 'Tree_016',
  Tree_017 = 'Tree_017',
  Tree_018 = 'Tree_018',
  Tree_019 = 'Tree_019',
  Tree_020 = 'Tree_020',
  Tree_021 = 'Tree_021',
}

type ItemsType = {
  world: Partial<Record<worldType, THREE.Group<THREE.Object3DEventMap>>>
  model: Partial<Record<modelType, THREE.Group<THREE.Object3DEventMap>>>
  animation: Partial<Record<animationType, THREE.Group<THREE.Object3DEventMap>>>
  texture: Partial<Record<texturesType, THREE.Texture>>
}

export const loads = {} as ItemsType

const load = (loader, types, dir = 'world', ext = '') => {
  let loaded = 0
  const entries = Object.entries(types)
  loads[dir] = {};

  return new Promise(resolve => {
    entries.forEach(([_, name], index) => {
      const path = `/${dir}/${name}${ext}`;

      loader.load(path, obj => {
        obj.name = name;
        loads[dir][name] = obj;
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
  load(loader, worldType, 'world', '.fbx'),
  load(loader, modelType, 'model', '.fbx'),
  load(loader, animationType, 'animation', '.fbx'),
];