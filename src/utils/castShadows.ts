import { Mesh, Object3D } from "three";

// Все меши внутри объекта отбрасывают тень от солнца; выключаются тени общим флагом рендерера
export const castShadows = <T extends Object3D>(root: T) => {
  root.traverse((object) => {
    if ((object as Mesh).isMesh) object.castShadow = true;
  });

  return root;
};
