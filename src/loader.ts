import * as THREE from 'three'
import modelXbot from "./models/gltf/Xbot.glb";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const textureLoader = new THREE.TextureLoader()

const texturesMap = {
  stone_wall: '/assets/stone_wall.jpg',
  wood_floor: '/assets/wood_floor.jpg',
}

export const textures: LoaderResourcesMap = {}

type LoaderResourcesMap = Partial<Record<keyof typeof texturesMap, any>>

export const loadTextures = async (): Promise<LoaderResourcesMap> => {
  let loaded = 0
  const entries = Object.entries(texturesMap)

  return new Promise(resolve => {
    entries.forEach(([textureName, path], index) => {
      textureLoader.load(path, (texture) => {
        textures[textureName] = texture
        loaded++

        if (loaded === entries.length) {
          resolve(textures)
        }
      });
    });
  })
}

const modelsMap = {
  modelXbot,
}

type LoaderModelsMap = Partial<Record<keyof typeof modelsMap, any>>

export const models: LoaderModelsMap = {}

export const loadModels = async (): Promise<LoaderModelsMap> => {
  let loaded = 0
  const entries = Object.entries(modelsMap)
  const loader = new GLTFLoader();

  return new Promise(resolve => {
    entries.forEach(([textureName, path], index) => {
      loader.load(path, gltf => {

        models[textureName] = gltf
        loaded++

        if (loaded === entries.length) {
          resolve(models)
        }
      });
    })
  })
}