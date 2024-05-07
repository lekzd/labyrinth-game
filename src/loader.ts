import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const textureLoader = new THREE.TextureLoader()
const loader = new FBXLoader();

const texturesMap = {
  stone_wall: '/assets/stone_wall.jpg',
  wood_floor: '/assets/wood_floor.jpg',
  tree: '/world/Tree.png',
}

export const textures: LoaderResourcesMap = {}

type LoaderResourcesMap = Partial<Record<keyof typeof texturesMap, THREE.Texture>>

export const loadTextures = async (): Promise<LoaderResourcesMap> => {
  let loaded = 0
  const entries = Object.entries(texturesMap)

  return new Promise(resolve => {
    entries.forEach(([textureName, path], index) => {
      textureLoader.load(path, (texture) => {
        textures[textureName as keyof typeof texturesMap] = texture
        loaded++

        if (loaded === entries.length) {
          resolve(textures)
        }
      });
    });
  })
}

export enum modelType {
  Monk = 'Monk',
  Cleric = 'Cleric',
  Rogue = 'Rogue',
  Warrior = 'Warrior',
  Wizard = 'Wizard',
}

type LoaderModelsMap = Partial<Record<modelType, THREE.Group<THREE.Object3DEventMap>>>

export const models: LoaderModelsMap = {}

export const loadModels = async (): Promise<LoaderModelsMap> => {
  let loaded = 0
  const entries = Object.entries(modelType)

  return new Promise(resolve => {
    entries.forEach(([_, name], index) => {
      loader.load(`/model/${name}.fbx`, obj => {
        obj.name = name;
        models[name] = obj;
        loaded++

        if (loaded === entries.length) {
          resolve(models)
        }
      });
    })
  })
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

type LoaderWorldsMap = Partial<Record<worldType, any>>

export const worlds: LoaderWorldsMap = {}

export const loadWorld = async (): Promise<LoaderWorldsMap> => {
  let loaded = 0
  const entries = Object.entries(worldType)

  return new Promise(resolve => {
    entries.forEach(([_, name], index) => {
      loader.load(`/world/${name}.fbx`, obj => {
        obj.name = name;
        worlds[name] = obj;
        loaded++

        if (loaded === entries.length) {
          resolve(worlds)
        }
      });
    })
  })
}