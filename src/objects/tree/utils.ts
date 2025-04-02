import { random } from "@/utils/random";
import { Mesh } from "three";

export const memoRandom = (func: () => Mesh, numb: number) => {
  const items: Mesh[] = [];

  return () => {
    if (items.length < numb) {
      const item = func();
      items.push(item);
      return item;
    }

    return items[random(0, numb)];
  };
};