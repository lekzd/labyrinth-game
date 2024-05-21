import { loads } from "../../loader";
import { something } from "../../utils/something";

export const createTree = () => {
  const model = something(Object.values(loads.world));

  const target = model.clone();

  target.scale.multiplyScalar(0.05);

  target.traverse((o) => {
    if (o.isMesh) {
      o.material.map = loads.texture["Tree.png"];
      o.material.needsUpdate = true;

      // o.castShadow = true;
      // o.receiveShadow = true;
    }
  });

  // target.castShadow = true;
  // target.receiveShadow = true;

  return target;
};
