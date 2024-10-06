import * as THREE from 'three'

const cache = new Map<string, THREE.Texture>()

export const textureRepeat = (texture: THREE.Texture, tw: number, th: number, mw: number, mh: number, rotation?: number) => {
  const key = `${texture.id}-${tw}-${th}-${mw}-${mh}-${rotation ?? 0}`
  if (cache.has(key)) {
    return cache.get(key)
  }

  const clonedTexture = texture.clone()
  clonedTexture.repeat = new THREE.Vector2(mw / tw, mh / th)
  clonedTexture.wrapS = THREE.RepeatWrapping
  clonedTexture.wrapT = THREE.RepeatWrapping
  clonedTexture.rotation = rotation ?? 0

  cache.set(key, clonedTexture)

  return clonedTexture
}