import * as THREE from 'three'

export const textureRepeat = (texture: THREE.Texture, tw: number, th: number, mw: number, mh: number) => {
  const clonedTexture = texture.clone()
  clonedTexture.repeat = new THREE.Vector2(mw / tw, mh / th)
  clonedTexture.wrapS = THREE.RepeatWrapping
  clonedTexture.wrapT = THREE.RepeatWrapping

  return clonedTexture
}