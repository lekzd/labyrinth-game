import { textures, worlds } from "../../loader";
import { something } from "../../utils/something";

export const createTree = () => {
  const model = something(Object.values(worlds));

  const target = model.clone();

  target.scale.multiplyScalar(.05);

  target.traverse(o => {
    if (o.isMesh) {
      o.material.map = textures.tree;
      o.material.needsUpdate = true

      // o.castShadow = true;
      // o.receiveShadow = true;
    }
  });

  // target.castShadow = true;
  // target.receiveShadow = true;

  return target;
}