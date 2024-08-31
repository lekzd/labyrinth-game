import { systems } from "@/systems";
import { Object3D } from "three";
import { assign } from "./assign";

type ShadowConfig = Partial<Pick<Object3D, "castShadow" | "receiveShadow">>;

export const shadowSetter = (mesh: Object3D, config: ShadowConfig) => {
  const callback = (shadows: boolean) => {
    if (shadows) {
      assign(mesh, config);
    } else {
      assign(mesh, {
        castShadow: false,
        receiveShadow: false
      });
    }
  }

  systems.uiSettingsSystem.events.on('renderer', ({ shadows }) => {
    callback(shadows);
  })

  callback(systems.uiSettingsSystem.settings.renderer.shadows);
};
