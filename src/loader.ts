import * as THREE from 'three'

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