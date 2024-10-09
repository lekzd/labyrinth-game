import { loads } from "@/loader";
import { AdditiveBlending, Sprite, SpriteMaterial, SpriteMaterialParameters } from "three";

interface Props extends SpriteMaterialParameters {
}

export const Shine = (props: Props) => {
  const shine = new Sprite(
    new SpriteMaterial({
      map: loads.texture["dot.png"],
      color: 0xFFFFFF,
      opacity: 0.5,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      ...props,
    })
  );

  return shine;
};
